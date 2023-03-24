package data

import (
	"github.com/go-openapi/strfmt"
	"gitlab.com/comentario/comentario/internal/api/models"
	"reflect"
	"testing"
)

func TestDecodeHexID(t *testing.T) {
	v := [32]byte{
		0x4e, 0xaf, 0x7f, 0xc2, 0xa6, 0xce, 0x88, 0xc9,
		0x41, 0x50, 0x59, 0xe2, 0x20, 0x1a, 0xb8, 0xcc,
		0xa1, 0xe0, 0x7e, 0x64, 0x70, 0x64, 0x75, 0x65,
		0x20, 0x57, 0x3a, 0x87, 0x40, 0x5b, 0x60, 0x92}
	tests := []struct {
		name    string
		id      models.HexID
		want    *[32]byte
		wantErr bool
	}{
		{"empty      ", "", nil, true},
		{"invalid hex", "4gaf7fc2a6ce88c9415059e2201ab8cca1e07e647064756520573a87405b6092", nil, true},
		{"too short  ", "41af7fc2a6ce88c9415059e2201ab8cca1e07e647064756520573a87405b609", nil, true},
		{"too long   ", "41af7fc2a6ce88c9415059e2201ab8cca1e07e647064756520573a87405b609412", nil, true},
		{"valid hex  ", "4eaf7fc2a6ce88c9415059e2201ab8cca1e07e647064756520573a87405b6092", &v, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DecodeHexID(tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("DecodeHexID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecodeHexID() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEmailToString(t *testing.T) {
	v1 := strfmt.Email("whatever@foo.bar")
	v2 := strfmt.Email("  spaces@foo.bar\n ")
	tests := []struct {
		name string
		v    *strfmt.Email
		want string
	}{
		{"nil       ", nil, ""},
		{"value     ", &v1, "whatever@foo.bar"},
		{"whitespace", &v2, "spaces@foo.bar"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EmailToString(tt.v); got != tt.want {
				t.Errorf("EmailToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRandomHexID(t *testing.T) {
	t.Run("randomness test", func(t *testing.T) {
		// Generate first ID
		h1, err1 := RandomHexID()
		if err1 != nil {
			t.Errorf("RandomHexID() invocation 1 errored with %v", err1)
		}

		// Generate second ID
		h2, err2 := RandomHexID()
		if err2 != nil {
			t.Errorf("RandomHexID() invocation 2 errored with %v", err2)
		}

		// The IDs must differ
		if h1 == h2 {
			t.Errorf("RandomHexID() generated 2 duplicate IDs = %x", h1)
		}
	})
}

func TestTrimmedString(t *testing.T) {
	v1 := "You see, it's complicated"
	v2 := "  \nBut not as complicated\t"
	tests := []struct {
		name string
		v    *string
		want string
	}{
		{"nil            ", nil, ""},
		{"regular value  ", &v1, "You see, it's complicated"},
		{"with whitespace", &v2, "But not as complicated"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TrimmedString(tt.v); got != tt.want {
				t.Errorf("TrimmedString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestURIToString(t *testing.T) {
	v := strfmt.URI("https://ouch.org")
	tests := []struct {
		name string
		v    *strfmt.URI
		want string
	}{
		{"nil  ", nil, ""},
		{"value", &v, "https://ouch.org"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := URIToString(tt.v); got != tt.want {
				t.Errorf("URIToString() = %v, want %v", got, tt.want)
			}
		})
	}
}
