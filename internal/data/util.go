package data

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"strings"
)

// DecodeHexID decodes a string hex ID into a byte array
func DecodeHexID(id models.HexID) (*[32]byte, error) {
	b, err := hex.DecodeString(string(id))
	if err != nil {
		return nil, err
	} else if l := len(b); l != 32 {
		return nil, fmt.Errorf("wrong decoded hex ID length (%d), want 32", l)
	}
	var b32 [32]byte
	copy(b32[:], b)
	return &b32, nil
}

// DecodeUUID converts a strfmt.UUID into a binary UUID
func DecodeUUID(sid strfmt.UUID) (*uuid.UUID, error) {
	u, e := uuid.Parse(string(sid))
	return &u, e
}

// EmailToString converts a value of *strfmt.Email into a string
func EmailToString(email *strfmt.Email) string {
	return TrimmedString((*string)(email))
}

// RandomHexID creates and returns a new, random hex ID
func RandomHexID() (models.HexID, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return models.HexID(hex.EncodeToString(b)), nil
}

// TrimmedString converts a *string value into a string, trimming all leading and trailing whitespace
func TrimmedString(s *string) string {
	if s == nil {
		return ""
	}
	return strings.TrimSpace(*s)
}

// URIToString converts a value of *strfmt.URI into a string
func URIToString(v *strfmt.URI) string {
	if v == nil {
		return ""
	}
	return string(*v)
}
