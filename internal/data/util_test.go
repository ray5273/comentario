package data

import (
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"reflect"
	"strings"
	"testing"
)

func TestDecodeUUID(t *testing.T) {
	v := uuid.MustParse("4eaf7fc2-a6ce-88c9-4150-59e2201ab8cc")
	tests := []struct {
		name    string
		id      strfmt.UUID
		want    *uuid.UUID
		wantErr bool
	}{
		{"empty          ", "", nil, true},
		{"invalid UUID   ", "4gaf7fc2a6ce88c9415059e2201ab8cc", nil, true},
		{"too short      ", "41af7fc2a6ce88c9415059e2201ab8c", nil, true},
		{"too long       ", "41af7fc2a6ce88c9415059e2201ab8cca", nil, true},
		{"valid solid    ", "4eaf7fc2a6ce88c9415059e2201ab8cc", &v, false},
		{"valid separated", "4eaf7fc2-a6ce-88c9-4150-59e2201ab8cc", &v, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DecodeUUID(tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("DecodeUUID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecodeUUID() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDecodeUUIDPtr(t *testing.T) {
	v := uuid.MustParse("4eaf7fc2-a6ce-88c9-4150-59e2201ab8cc")
	tests := []struct {
		name    string
		id      *strfmt.UUID
		want    *uuid.UUID
		wantErr bool
	}{
		{"nil            ", nil, nil, false},
		{"empty          ", (*strfmt.UUID)(swag.String("")), nil, true},
		{"invalid UUID   ", (*strfmt.UUID)(swag.String("4gaf7fc2a6ce88c9415059e2201ab8cc")), nil, true},
		{"too short      ", (*strfmt.UUID)(swag.String("41af7fc2a6ce88c9415059e2201ab8c")), nil, true},
		{"too long       ", (*strfmt.UUID)(swag.String("41af7fc2a6ce88c9415059e2201ab8cca")), nil, true},
		{"valid solid    ", (*strfmt.UUID)(swag.String("4eaf7fc2a6ce88c9415059e2201ab8cc")), &v, false},
		{"valid separated", (*strfmt.UUID)(swag.String("4eaf7fc2-a6ce-88c9-4150-59e2201ab8cc")), &v, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DecodeUUIDPtr(tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("DecodeUUIDPtr() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecodeUUIDPtr() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEmailPtrToString(t *testing.T) {
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
			if got := EmailPtrToString(tt.v); got != tt.want {
				t.Errorf("EmailPtrToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEmailToString(t *testing.T) {
	tests := []struct {
		name string
		v    strfmt.Email
		want string
	}{
		{"empty     ", "", ""},
		{"value     ", strfmt.Email("whatever@foo.bar"), "whatever@foo.bar"},
		{"whitespace", strfmt.Email("  spaces@foo.bar\n "), "spaces@foo.bar"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EmailToString(tt.v); got != tt.want {
				t.Errorf("EmailToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNullUUIDPtr(t *testing.T) {
	u := uuid.MustParse("315368f7d10c4f8992b12f1e0a00bcc8")
	tests := []struct {
		name string
		id   *uuid.NullUUID
		want *uuid.UUID
	}{
		{"null and no value   ", &uuid.NullUUID{}, nil},
		{"null but with value ", &uuid.NullUUID{UUID: u}, nil},
		{"with value, not null", &uuid.NullUUID{UUID: u, Valid: true}, &u},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NullUUIDPtr(tt.id); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NullUUIDPtr() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNullUUIDStr(t *testing.T) {
	tests := []struct {
		name string
		id   *uuid.NullUUID
		want strfmt.UUID
	}{
		{"null and no value   ", &uuid.NullUUID{}, ""},
		{"null but with value ", &uuid.NullUUID{UUID: uuid.MustParse("315368f7d10c4f8992b12f1e0a00bcc8")}, ""},
		{"with value, not null", &uuid.NullUUID{UUID: uuid.MustParse("315368f7d10c4f8992b12f1e0a00bcc8"), Valid: true}, "315368f7-d10c-4f89-92b1-2f1e0a00bcc8"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NullUUIDStr(tt.id); got != tt.want {
				t.Errorf("NullUUIDStr() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPageIndex(t *testing.T) {
	i0 := uint64(0)
	i1 := uint64(1)
	i2 := uint64(42)
	tests := []struct {
		name string
		v    *uint64
		want int
	}{
		{"nil", nil, -1},
		{"0  ", &i0, -1},
		{"1  ", &i1, 0},
		{"42 ", &i2, 41},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			if got := PageIndex(tt.v); got != tt.want {
				t.Errorf("PageIndex() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPasswordPtrToString(t *testing.T) {
	p := strfmt.Password("s3cr3t")
	tests := []struct {
		name string
		v    *strfmt.Password
		want string
	}{
		{"nil  ", nil, ""},
		{"value", &p, "s3cr3t"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PasswordPtrToString(tt.v); got != tt.want {
				t.Errorf("PasswordPtrToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

type testX struct {
	x int
}

type testY = testX

func (x *testX) ToDTO() *testY {
	return &testY{x: x.x + 1}
}

func TestSliceToDTOs(t *testing.T) {
	tests := []struct {
		name string
		in   []*testX
		want []*testY
	}{
		{"nil     ", nil, nil},
		{"empty   ", []*testX{}, []*testY{}},
		{"nonempty", []*testX{{52}, {64}, {0}, {-77}}, []*testY{{53}, {65}, {1}, {-76}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SliceToDTOs[*testX, *testY](tt.in); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SliceToDTOs() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPathToString(t *testing.T) {
	tests := []struct {
		name string
		v    models.Path
		want string
	}{
		{"empty           ", "", ""},
		{"empty whitespace", "\n\t ", ""},
		{"value     ", "/ouch.org", "/ouch.org"},
		{"whitespace", "\t   /whitespace.org\n \t", "/whitespace.org"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PathToString(tt.v); got != tt.want {
				t.Errorf("PathToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPtrToNullUUID(t *testing.T) {
	u := uuid.MustParse("315368f7d10c4f8992b12f1e0a00bcc8")
	tests := []struct {
		name string
		id   *uuid.UUID
		want *uuid.NullUUID
	}{
		{"nil    ", nil, &uuid.NullUUID{}},
		{"non-nil", &u, &uuid.NullUUID{UUID: u, Valid: true}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PtrToNullUUID(tt.id); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PtrToNullUUID() = %v, want %v", got, tt.want)
			}
		})
	}
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

func TestURIPtrToString(t *testing.T) {
	v1 := strfmt.URI("https://ouch.org")
	v2 := strfmt.URI(" https://whitespace.org\n\n\t")
	tests := []struct {
		name string
		v    *strfmt.URI
		want string
	}{
		{"nil       ", nil, ""},
		{"value     ", &v1, "https://ouch.org"},
		{"whitespace", &v2, "https://whitespace.org"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := URIPtrToString(tt.v); got != tt.want {
				t.Errorf("URIPtrToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestURIToString(t *testing.T) {
	tests := []struct {
		name string
		v    strfmt.URI
		want string
	}{
		{"empty           ", "", ""},
		{"empty whitespace", "\n\t ", ""},
		{"value     ", "https://ouch.org", "https://ouch.org"},
		{"whitespace", "\t   https://whitespace.org\n \t", "https://whitespace.org"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := URIToString(tt.v); got != tt.want {
				t.Errorf("URIToString() = %v, want %v", got, tt.want)
			}
		})
	}
}
