package wskeyid

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"math/big"
	"strings"
)

// The format is going to be of the form:
//
// <format>$<base-64-encoded data>
//
// For example
//
// WebCrypto-raw.EC.P-256$BJsxA+HaVosJsyVC/Sm7BkeOwCavi1hlG/2FhJl+k4YQsCqMPbETZl0CM8/JHJ3BlUywxRMYTKocQA+deDIsAOQ=

// ParseKeyFromClientID parses the client ID string, and returns an elliptic
// curve public key.
//
// If parsing failed, then an the public key will be set to null, and instead an
// error will be returned.
func ParseKeyFromClientID(clientId string) (*ecdsa.PublicKey, error) {
	parts := strings.Split(clientId, "$")
	if len(parts) != 2 {
		// TODO: this is where we may want to be detailed as to why is the client ID
		//   a bad format.
		return nil, ErrBadClientIDFormat
	}

	format, content := parts[0], parts[1]

	// TODO: be able to accept P-256, P-384, and P-512
	if format != "WebCrypto-raw.EC.P-256" {
		return nil, ErrUnknownClientIDFormat
	}

	buff, err := base64.StdEncoding.DecodeString(content)
	if err != nil {
		return nil, err
	}

	if buff[0] != 0x04 {
		return nil, ErrUnknownNISTKeyFormat
	}

	if (len(buff)-1)%2 != 0 {
		return nil, ErrUnknownNISTKeyFormat
	}

	x := &big.Int{}
	y := &big.Int{}

	x.SetBytes(buff[1 : (len(buff)-1)/2+1])
	y.SetBytes(buff[(len(buff)-1)/2+1:])

	return &ecdsa.PublicKey{
		X:     x,
		Y:     y,
		Curve: elliptic.P256(),
	}, nil
}
