package wskeyid

import (
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"

	"github.com/shovon/go/wskeyid/messages/clientmessage"
	"github.com/shovon/go/wskeyid/messages/servermessages"

	"github.com/gorilla/websocket"
	"github.com/shovon/gorillawswrapper"
)

const challengeByteLength = 128

// It will be safe to assume that any error coming from this function is a client
func getChallengePayload() (plaintext string, err error) {
	b := make([]byte, challengeByteLength)
	n, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	if n < challengeByteLength {
		return "", ErrFailedToReadRandomNumbers
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// It will be safe to assume that any error coming from this function is
func parseChallengeResponse(m gorillawswrapper.Message) (plaintext []byte, signature []byte, err error) {
	var clientMessage clientmessage.Message
	err = json.Unmarshal(m.Message, &clientMessage)
	if err != nil {
		return nil, nil, err
	}

	if clientMessage.Type != "CHALLENGE_RESPONSE" {
		return nil, nil, ErrNotAChallengeResponse
	}

	var cr clientmessage.ChallengeResponse
	err = json.Unmarshal(clientMessage.Data, &cr)
	if err != nil {
		return nil, nil, err
	}

	plaintext, err = base64.StdEncoding.DecodeString(cr.Payload)
	if err != nil {
		return nil, nil, err
	}
	signature, err = base64.StdEncoding.DecodeString(cr.Signature)
	if err != nil {
		return nil, nil, err
	}

	return plaintext, signature, err
}

func verifySignature(key *ecdsa.PublicKey, pt, sig []byte) bool {
	if len(sig) < 64 {
		return false
	}

	rBuf, sBuf := sig[0:32], sig[32:]
	r := &big.Int{}
	s := &big.Int{}
	r.SetBytes(rBuf)
	s.SetBytes(sBuf)

	hash := sha256.Sum256(pt)

	return ecdsa.Verify(key, hash[:], r, s)
}

func HandleAuthConnection(r *http.Request, c *websocket.Conn) error {
	conn := gorillawswrapper.NewWrapper(c)
	defer conn.Stop()

	// Grab the client ID
	clientId := strings.TrimSpace(r.URL.Query().Get("client_id"))
	key, err := ParseKeyFromClientID(clientId)
	if err != nil {
		{
			err := conn.WriteJSON(servermessages.CreateClientError(
				servermessages.ErrorPayload{
					Title:  "Bad client ID was supplied",
					Detail: err.Error(),
					Meta: map[string]string{
						"client_id": clientId,
					},
				},
			))
			if err != nil {
				return err
			}
		}
		return err
	}
	if key == nil {
		panic("the key should not have been null, but alas, it was")
	}

	payload, err := getChallengePayload()
	if err != nil {
		{
			err := conn.WriteJSON(servermessages.CreateServerError(servermessages.ErrorPayload{
				Title:  "Error generating challenge payload",
				Detail: err.Error(),
			}))
			if err != nil {
				return err
			}
		}
		return err
	}

	err = conn.WriteJSON(servermessages.Message{
		Type: "CHALLENGE",
		Data: servermessages.Challenge{Payload: payload},
	})
	if err != nil {
		return err
	}
	for {
		m, ok := <-conn.MessagesChannel()
		if !ok {
			return ErrConnectionClosed
		}

		pt, sig, err := parseChallengeResponse(m)

		if err != nil {
			err := conn.WriteJSON(
				servermessages.CreateClientError(
					servermessages.ErrorPayload{
						Title:  "Not a challenge response",
						Detail: "Expected a challenge response but got something else that the JSON parser was not able to parse",
						Meta:   map[string]string{"error": err.Error()},
					},
				),
			)
			if err != nil {
				return err
			}
			continue
		}

		if !verifySignature(key, pt, sig) {
			err := conn.WriteJSON(
				servermessages.CreateClientError(
					servermessages.ErrorPayload{
						Title:  "Signature verification failed",
						Detail: "The signature failed to verify",
						Meta: map[string][]byte{
							"payload":   pt,
							"signature": sig,
						},
					},
				),
			)
			if err != nil {
				return err
			}
			return ErrSignatureDoesNotMatch
		}

		break
	}

	err = conn.WriteJSON(servermessages.MessageNoData{Type: "CONNECTED"})
	if err != nil {
		return err
	}

	return nil
}
