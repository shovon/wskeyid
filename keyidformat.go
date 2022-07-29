package wskeyid

import (
	"crypto/ecdsa"
	"strings"
)

func parseKeyFromClientId(clientId string) (*ecdsa.PublicKey, error) {
	if !strings.Contains(clientId, "$") {
		return nil, ErrBadClientIdFormat
	}

	parts := strings.Split(clientId, "$")
	if len(parts) != 2 {
		return nil, ErrBadClientIdFormat
	}
}
