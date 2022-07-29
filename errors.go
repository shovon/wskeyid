package wskeyid

import "errors"

var (
	ErrClientIdWasNotSupplied    = errors.New("the client ID was not supplied by the client")
	ErrBadClientIDFormat         = errors.New("the client ID is of a bad format. Expected a string of format <format>$<base64-encoded buffer>, e.g. WebCrypto-raw.EC.P-256$JsxA+HaVosJsyVC/S")
	ErrUnknownClientIDFormat     = errors.New("unknown client ID format")
	ErrUnknownNISTKeyFormat      = errors.New("unkown NIST key format; expected the first byte to be exactly 0x04, and the remainder of the key to be a byte buffer divisible by 2")
	ErrUnsuportedClientIdVersion = errors.New("the client ID version is unsupported. The first two bytes of the base64-encoded value of the client ID must be an int16 value equal exactly to 0x01")
	ErrUnsupportedECDSAKeyType   = errors.New("the ECDSA key must be of type 4, as represented by the first byte of the key itself (3rd byte in the buffer)")
	ErrFailedToReadRandomNumbers = errors.New("in an attempt to generate the challenge, the server failed to read the adequate number bytes needed for our challenge")
	ErrNotAChallengeResponse     = errors.New("the message received was not a challenge response")
	ErrConnectionClosed          = errors.New("the connection was closed, in the middle of the handshake")
	ErrSignatureDoesNotMatch     = errors.New("the signature provided by the client did not match the public key provided")
)
