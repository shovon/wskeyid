package wskeyid

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	mathrand "math/rand"
	"net/http"
	"strings"

	"github.com/shovon/wskeyid/messages/clientmessage"
	"github.com/shovon/wskeyid/messages/servermessages"

	"github.com/gorilla/websocket"
	"github.com/shovon/gorillawswrapper"
)

var (
	ErrClientIdWasNotSupplied    = errors.New("the client ID was not supplied by the client")
	ErrBadClientIdFormat         = errors.New("the client ID is of a bad format. Expected a base64 string, that encodes a buffer of 67 bytes but got something else")
	ErrUnsuportedClientIdVersion = errors.New("the client ID version is unsupported. The first two bytes of the base64-encoded value of the client ID must be an int16 value equal exactly to 0x01")
	ErrUnsupportedECDSAKeyType   = errors.New("the ECDSA key must be of type 4, as represented by the first byte of the key itself (3rd byte in the buffer)")
	ErrFailedToReadRandomNumbers = errors.New("in an attempt to generate the challenge, the server failed to read the adequate number bytes needed for our challenge")
	ErrNotAChallengeResponse     = errors.New("the message received was not a challenge response")
	ErrConnectionClosed          = errors.New("the connection was closed, in the middle of the handshake")
	ErrSignatureDoesNotMatch     = errors.New("the signature provided by the client did not match the public key provided")
)

// We will assume that errors coming from this function will always be errors
// that were caused by the client.
func getkeyFromClientId(clientId string) (*ecdsa.PublicKey, error) {
	// TODO: move all of this to a separate file, and write some rudimentary Go
	//   tests

	if len(clientId) <= 0 {
		return nil, ErrClientIdWasNotSupplied
	}
	buf, err := base64.StdEncoding.DecodeString(clientId)
	if err != nil {
		return nil, err
	}
	if len(buf) != (2 + 1 + 32 + 32) {
		return nil, ErrBadClientIdFormat
	}
	versionBuf, kind, xBuf, yBuf := buf[0:2], buf[2], buf[3:35], buf[35:]
	version := uint16(versionBuf[0])<<8 | uint16(versionBuf[1])
	if version != 1 {
		return nil, ErrUnsuportedClientIdVersion
	}
	if kind != 0x4 {
		return nil, ErrUnsupportedECDSAKeyType
	}
	x := &big.Int{}
	y := &big.Int{}
	x.SetBytes(xBuf)
	y.SetBytes(yBuf)
	key := &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}
	return key, nil
}

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

func randInt(max int) int {
	return int(mathrand.Float32() * float32(max))
}

func HandleAuthConnection(r *http.Request, c *websocket.Conn) error {
	conn := gorillawswrapper.NewWrapper(c)
	defer conn.Stop()

	// Grab the client ID
	clientId := strings.TrimSpace(r.URL.Query().Get("client_id"))
	key, err := getkeyFromClientId(clientId)
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

	// go func() {
	// 	for !conn.HasStopped() {
	// 		<-time.After(time.Second * time.Duration(randInt(10)))
	// 		err := conn.WriteJSON(servermessages.Message{Type: "TEXT_MESSAGE", Data: "Cool"})
	// 		if err != nil {
	// 			return err
	// 		}
	// 	}
	// }()

	// for msg := range conn.MessagesChannel() {
	// 	var m clientmessage.Message
	// 	json.Unmarshal(msg.Message, &m)
	// 	if m.Type != "TEXT_MESSAGE" {
	// 		fmt.Printf("Got message of %s from %s", m.Type, clientId)
	// 		continue
	// 	}
	// 	var str string
	// 	err := m.UnmarshalData(&str)
	// 	if err != nil {
	// 		fmt.Printf("Failed to get message body")
	// 	} else {
	// 		fmt.Printf("Got message from client %s: %s", clientId, str)
	// 	}
	// }

	// log.Info().Msg("Client closed the connection. Ending the connection")

	return nil
}
