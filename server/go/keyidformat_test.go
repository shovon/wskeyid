package wskeyid

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"math/big"
	"testing"
)

func TestParseKeyFromClientIDNoDollar(t *testing.T) {
	badKey1 := "djfkdjfdjf"
	badKey2 := "a$b$c"

	{
		keyResult, err := ParseKeyFromClientID(badKey1)
		if keyResult != nil {
			t.Fail()
		}

		if err != ErrBadClientIDFormat {
			t.Fail()
		}
	}

	{
		keyResult, err := ParseKeyFromClientID(badKey2)
		if keyResult != nil {
			t.Fail()
		}

		if err != ErrBadClientIDFormat {
			t.Fail()
		}
	}

}

func TestParseKeyFromClientID(t *testing.T) {
	x := big.Int{}
	x.SetString("9b3103e1da568b09b32542fd29bb06478ec026af8b58651bfd8584997e938610", 16)

	y := big.Int{}
	y.SetString("b02a8c3db113665d0233cfc91c9dc1954cb0c513184caa1c400f9d78322c00e4", 16)

	expectedKey := ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     &x,
		Y:     &y,
	}

	nistKey := []byte{}
	nistKey = append(nistKey, 0x04)
	nistKey = append(nistKey, x.Bytes()...)
	nistKey = append(nistKey, y.Bytes()...)

	nistKeyBase64 := base64.StdEncoding.EncodeToString([]byte(nistKey))

	keyId := "WebCrypto-raw.EC.P-256$" + nistKeyBase64

	keyResult, err := ParseKeyFromClientID(keyId)
	if err != nil {
		t.Error(err)
	}

	if keyResult == nil {
		t.FailNow()
		return
	}

	if !expectedKey.Equal(keyResult) {
		t.Fail()
	}
}
