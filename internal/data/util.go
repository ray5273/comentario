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
	if u, e := uuid.Parse(string(sid)); e != nil {
		return nil, e
	} else {
		return &u, e
	}
}

// EmailPtrToString converts a value of *strfmt.Email into a string
func EmailPtrToString(email *strfmt.Email) string {
	return TrimmedString((*string)(email))
}

// NullUUIDStr converts a nullable UUID value into strfmt.UUID
func NullUUIDStr(u *uuid.NullUUID) strfmt.UUID {
	if !u.Valid {
		return ""
	}
	return strfmt.UUID(u.UUID.String())
}

// PathToString converts a value of models.Path into a string
func PathToString(v models.Path) string {
	return strings.TrimSpace(string(v))
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

// URIPtrToString converts a value of *strfmt.URI into a string
func URIPtrToString(v *strfmt.URI) string {
	if v == nil {
		return ""
	}
	return URIToString(*v)
}

// URIToString converts a value of strfmt.URI into a string
func URIToString(v strfmt.URI) string {
	return strings.TrimSpace(string(v))
}
