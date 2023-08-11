package data

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"strings"
	"time"
)

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

// EmailToString converts a value of strfmt.Email into a string
func EmailToString(email strfmt.Email) string {
	return strings.TrimSpace(string(email))
}

// NullBoolToPtr converts a nullable bool value into *bool
func NullBoolToPtr(b sql.NullBool) *bool {
	if !b.Valid {
		return nil
	}
	return &b.Bool
}

// NullDateTime converts a nullable Time value into strfmt.DateTime
func NullDateTime(t sql.NullTime) strfmt.DateTime {
	if !t.Valid {
		return strfmt.DateTime{}
	}
	return strfmt.DateTime(t.Time)
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

// SliceToDTOs converts a slice of models into a slice of DTO instances using the ToDTO() method of the former
func SliceToDTOs[F DTOAware[T], T any](in []F) []T {
	// Nil pointers will be passed through
	if in == nil {
		return nil
	}

	// Convert the slice
	out := make([]T, len(in))
	for i, v := range in {
		out[i] = v.ToDTO()
	}
	return out
}

// ToNullDateTime converts an strfmt.DateTime into a nullable Time value
func ToNullDateTime(dt strfmt.DateTime) (t sql.NullTime) {
	if !dt.IsZero() {
		t.Time = time.Time(dt)
		t.Valid = true
	}
	return
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
