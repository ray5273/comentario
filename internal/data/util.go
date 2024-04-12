package data

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
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

// DecodeUUIDPtr converts a *strfmt.UUID into a binary UUID. Returns nil if the pointer is nil
func DecodeUUIDPtr(pid *strfmt.UUID) (*uuid.UUID, error) {
	if pid == nil {
		return nil, nil
	}
	return DecodeUUID(*pid)
}

// EmailPtrToString converts a value of *strfmt.Email into a string
func EmailPtrToString(email *strfmt.Email) string {
	return TrimmedString((*string)(email))
}

// EmailToString converts a value of strfmt.Email into a string
func EmailToString(email strfmt.Email) string {
	return strings.TrimSpace(string(email))
}

// NowNullable returns a nullable time object for the current instant
func NowNullable() sql.NullTime {
	return sql.NullTime{Time: time.Now().UTC(), Valid: true}
}

// NullDateTime converts a nullable Time value into strfmt.DateTime
func NullDateTime(t sql.NullTime) strfmt.DateTime {
	if !t.Valid {
		return strfmt.DateTime{}
	}
	return strfmt.DateTime(t.Time)
}

// NullUUIDPtr converts a nullable UUID value into *uuid.UUID
func NullUUIDPtr(u *uuid.NullUUID) *uuid.UUID {
	if !u.Valid {
		return nil
	}
	return &u.UUID
}

// NullUUIDStr converts a nullable UUID value into strfmt.UUID
func NullUUIDStr(u *uuid.NullUUID) strfmt.UUID {
	if !u.Valid {
		return ""
	}
	return strfmt.UUID(u.UUID.String())
}

// PageIndex converts the standard, 1-based, queryPageNumber parameter into a 0-based int index
func PageIndex(pageNumber *uint64) int {
	return int(swag.Uint64Value(pageNumber) - 1)
}

// PasswordPtrToString converts a value of *strfmt.Password into a string
func PasswordPtrToString(pwd *strfmt.Password) string {
	return swag.StringValue((*string)(pwd))
}

// PathToString converts a value of models.Path into a string
func PathToString(v models.Path) string {
	return strings.TrimSpace(string(v))
}

// PtrToNullUUID converts a *uuid.UUID value into a nullable UUID
func PtrToNullUUID(u *uuid.UUID) *uuid.NullUUID {
	if u == nil {
		return &uuid.NullUUID{}
	}
	return &uuid.NullUUID{UUID: *u, Valid: true}
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
