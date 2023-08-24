package util

import (
	"bytes"
	"github.com/go-openapi/strfmt"
	"reflect"
	"strings"
	"testing"
)

func TestCompressGzip(t *testing.T) {
	tests := []struct {
		name    string
		b       []byte
		want    []byte
		wantErr bool
	}{
		{
			"nil",
			nil,
			[]byte{
				0x1f, 0x8b, 0x8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x1, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			},
			false,
		},
		{
			"empty",
			[]byte{},
			[]byte{
				0x1f, 0x8b, 0x8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x1, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			},
			false,
		},
		{
			"data",
			[]byte(`{"version":1}`),
			[]byte{
				0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xaa, 0x56, 0x2a, 0x4b, 0x2d, 0x2a, 0xce,
				0xcc, 0xcf, 0x53, 0xb2, 0x32, 0xac, 0x05, 0x04, 0x00, 0x00, 0xff, 0xff, 0x33, 0x9a, 0x30, 0x71, 0x0d,
				0x00, 0x00, 0x00,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CompressGzip(tt.b)
			if (err != nil) != tt.wantErr {
				t.Errorf("CompressGzip() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("CompressGzip() got = %#v, want %v", got, tt.want)
			}
		})
	}
}

func TestCountryByIP(t *testing.T) {
	tests := []struct {
		name string
		ip   string
		want string
	}{
		{"1.1.1.1            ", "1.1.1.1", "US"},
		{"95.25.1.1          ", "95.25.1.1", "RU"},
		{"localhost          ", "127.0.0.1", ""},
		{"nonexistent address", "255.255.255.0", ""},
		{"invalid address    ", "blah.blah", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountryByIP(tt.ip); got != tt.want {
				t.Errorf("CountryByIP() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDecompressGzip(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		want    []byte
		wantErr bool
	}{
		{"nil", nil, nil, true},
		{"faulty", []byte{0xff, 0xff, 0x00}, nil, true},
		{
			"empty",
			[]byte{0x1f, 0x8b, 0x8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x1, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00},
			[]byte{},
			false,
		},
		{
			"data",
			[]byte{
				0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xaa, 0x56, 0x2a, 0x4b, 0x2d, 0x2a, 0xce,
				0xcc, 0xcf, 0x53, 0xb2, 0x32, 0xac, 0x05, 0x04, 0x00, 0x00, 0xff, 0xff, 0x33, 0x9a, 0x30, 0x71, 0x0d,
				0x00, 0x00, 0x00,
			},
			[]byte(`{"version":1}`),
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := bytes.NewReader(tt.input)
			got, err := DecompressGzip(r)
			if (err != nil) != tt.wantErr {
				t.Errorf("DecompressGzip() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecompressGzip() got = %#v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefault_String(t *testing.T) {
	tests := []struct {
		name         string
		value        string
		defaultValue string
		want         string
	}{
		{"empty             ", "", "", ""},
		{"nonempty          ", "bar", "", "bar"},
		{"empty + default   ", "", "foo", "foo"},
		{"nonempty + default", "bar", "foo", "bar"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Default(tt.value, tt.defaultValue); got != tt.want {
				t.Errorf("Default() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefault_Int(t *testing.T) {
	tests := []struct {
		name         string
		value        int
		defaultValue int
		want         int
	}{
		{"zero             ", 0, 0, 0},
		{"nonzero          ", 17, 0, 17},
		{"zero + default   ", 0, 42, 42},
		{"nonzero + default", 17, 42, 17},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Default(tt.value, tt.defaultValue); got != tt.want {
				t.Errorf("Default() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefault_Ptr(t *testing.T) {
	type ps = *struct{}
	val := &struct{}{}
	def := &struct{}{}
	tests := []struct {
		name         string
		value        ps
		defaultValue ps
		want         ps
	}{
		{"zero             ", nil, nil, nil},
		{"nonzero          ", val, nil, val},
		{"zero + default   ", nil, def, def},
		{"nonzero + default", val, def, val},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Default(tt.value, tt.defaultValue); got != tt.want {
				t.Errorf("Default() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHTMLDocumentTitle(t *testing.T) {
	tests := []struct {
		name    string
		data    string
		want    string
		wantErr bool
	}{
		{"empty", "", "", true},
		{"bad html", "<whatever><<<<", "", true},
		{"empty title", "<html><head><title></title></head></html>", "", true},
		{"valid title", "<html><head><title>Wooh</title></head></html>", "Wooh", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := bytes.NewReader([]byte(tt.data))
			got, err := HTMLDocumentTitle(reader)
			if (err != nil) != tt.wantErr {
				t.Errorf("HTMLDocumentTitle() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("HTMLDocumentTitle() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIf_bool(t *testing.T) {
	tests := []struct {
		name    string
		cond    bool
		ifTrue  bool
		ifFalse bool
		want    bool
	}{
		{"false", false, false, true, true},
		{"true", true, false, true, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := If(tt.cond, tt.ifTrue, tt.ifFalse); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("If() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIf_int(t *testing.T) {
	tests := []struct {
		name    string
		cond    bool
		ifTrue  int
		ifFalse int
		want    int
	}{
		{"false", false, 17, 42, 42},
		{"true", true, 17, 42, 17},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := If(tt.cond, tt.ifTrue, tt.ifFalse); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("If() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIf_string(t *testing.T) {
	tests := []struct {
		name    string
		cond    bool
		ifTrue  string
		ifFalse string
		want    string
	}{
		{"false", false, "foo", "bar", "bar"},
		{"true", true, "foo", "bar", "foo"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := If(tt.cond, tt.ifTrue, tt.ifFalse); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("If() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIndexOfString(t *testing.T) {
	slice := []string{
		"",
		"foo",
		"bar",
		"foobar",
		"bar",
	}
	tests := []struct {
		name string
		s    string
		want int
	}{
		{"empty string             ", "", 0},
		{"existing string          ", "foo", 1},
		{"existing string, repeated", "bar", 2},
		{"non-existing string      ", "baz", -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IndexOfString(tt.s, slice); got != tt.want {
				t.Errorf("IndexOfString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		s    string
		want bool
	}{
		{"abc@def.ru", true},
		{"abc@yktoo.solutions", true},
		{"abc.lastname@example.com", true},
		{"abc.last+new@def.ru", true},
		{"abc.last+new.long@def.ru", true},
		{"abc.last=oi@def.ru", true},
		{"abc@def-.com", true}, // Is it true actually?
		{"abc@de.f.com", true},
		{"abc@def.x", true},
		{"abc@def", true},
		{"abc[@def.com", false},
		{"abc]@def.com", false},
		{"abc @def.com", false},
		{"abc\n@def.com", false},
		{"abc\t@def.com", false},
		{"abc<@def.com", false},
		{"abc>@def.com", false},
		{"abc(@def.com", false},
		{"abc)@def.com", false},
		{"abc[@def.com", false},
		{"abc]@def.com", false},
		{"abc\\@def.com", false},
		{"abc.@def.com", false},
		{"abc,@def.com", false},
		{"abc;@def.com", false},
		{"abc:@def.com", false},
		{"abc@@def.com", false},
		{"abc\"@def.com", false},
		{"abc%@def.com", false},
		{"abc@def..com", false},
		{"abc@de!f.com", false},
		{"abc@de@f.com", false},
		{"abc@de#f.com", false},
		{"abc@de$f.com", false},
		{"abc@de%f.com", false},
		{"abc@de^f.com", false},
		{"abc@de&f.com", false},
		{"abc@de*f.com", false},
		{"abc@de(f.com", false},
		{"abc@de)f.com", false},
		{"abc@de_f.com", false},
		{"abc@de+f.com", false},
		{"abc@de=f.com", false},
		{"abc@de{f.com", false},
		{"abc@de}f.com", false},
		{"abc@de[f.com", false},
		{"abc@de]f.com", false},
		{"abc@de'f.com", false},
		{"abc@de\"f.com", false},
		{"abc@de\\f.com", false},
		{"abc@de|f.com", false},
		{"abc@de:f.com", false},
		{"abc@de;f.com", false},
		{"abc@de<f.com", false},
		{"abc@de>f.com", false},
		{"abc@de,f.com", false},
		{"abc@de/f.com", false},
		{"abc@de?f.com", false},
		{"abc@de~f.com", false},
		{"abc@de`f.com", false},
		{"abc@de f.com", false},
		{"abc@de\nf.com", false},
		{"abc@de\tf.com", false},
	}
	for _, tt := range tests {
		t.Run(tt.s, func(t *testing.T) {
			if got := IsValidEmail(tt.s); got != tt.want {
				t.Errorf("IsValidEmail() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidHexID(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want bool
	}{
		{"empty string           ", "", false},
		{"string of 63 digits    ", "012345678901234567890123456789012345678901234567890123456789012", false},
		{"string of 64 bad chars ", "012345678901234567890123456789012345678901234567890123456789012g", false},
		{"string of 65 digits    ", "01234567890123456789012345678901234567890123456789012345678901234", false},
		{"string of 64 digits    ", "0123456789012345678901234567890123456789012345678901234567890123", true},
		{"string of 64 hex digits", "1dae2342c9255a4ecc78f2f54380d90508aa49761f3471e94239f178a210bcba", true},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			if got := IsValidHexID(tt.s); got != tt.want {
				t.Errorf("IsValidHexID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidHostname(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want bool
	}{
		{"empty string                     ", "", false},
		{"single .                         ", ".", false},
		{"single -                         ", "-", false},
		{"single part starting with -      ", "-example", false},
		{"single part containing _         ", "ex_ample", false},
		{"single part, alpha               ", "example", true},
		{"single part, alphanumeric 1      ", "examp1e2", true},
		{"single part, alphanumeric 2      ", "2examp1e", true},
		{"single part 63 chars long        ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjkndsrfigjnsf", true},
		{"single part too long             ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjikndsrfigjnsf", false},
		{"two dots in a row                ", "e..a", false},
		{"two parts 1                      ", "e.ax", true},
		{"two parts 2                      ", "ex.ample", true},
		{"two parts, second starting with -", "ex.-ample", false},
		{"two parts, one 63 chars long     ", "ex.mplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", true},
		{"two parts, one too long          ", "ex.amplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", false},
		{"many parts                       ", "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", true},
		{"many parts, length 253 chars     ", "a.very.very.very.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.dooooooooooooooooooooooooooooooomain.name.nl", true},
		{"many parts, length 254 chars     ", "a.very.very.very.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong.doooooooooooooooooooooooooooooooomain.name.nl", false},
		{"google.com                       ", "google.com", true},
		{"google.com:80                    ", "google.com:80", false},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			if got := IsValidHostname(tt.s); got != tt.want {
				t.Errorf("IsValidHostname() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidHostPort(t *testing.T) {
	tests := []struct {
		name      string
		s         string
		wantValid bool
		wantHost  string
		wantPort  string
	}{
		{"empty string                                ", "", false, "", ""},
		{"only port                                   ", ":80", false, "", ""},
		{"no port, single .                           ", ".", false, "", ""},
		{"with port, single .                         ", ".:3128", false, "", ""},
		{"no port, single -                           ", "-", false, "", ""},
		{"with port, single -                         ", "-:3128", false, "", ""},
		{"no port, single part starting with -        ", "-example", false, "", ""},
		{"with port, single part starting with -      ", "-example:3128", false, "", ""},
		{"no port, single part containing _           ", "ex_ample", false, "", ""},
		{"with port, single part containing _         ", "ex_ample:3128", false, "", ""},
		{"no port, single part, alpha                 ", "example", true, "example", ""},
		{"with port, single part, alpha               ", "example:3128", true, "example", "3128"},
		{"no port, single part, alphanumeric 1        ", "examp1e2", true, "examp1e2", ""},
		{"with port, single part, alphanumeric 1      ", "examp1e2:3128", true, "examp1e2", "3128"},
		{"no port, single part, alphanumeric 2        ", "2examp1e", true, "2examp1e", ""},
		{"with port, single part, alphanumeric 2      ", "2examp1e:3128", true, "2examp1e", "3128"},
		{"no port, single part 63 chars long          ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjkndsrfigjnsf", true, "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjkndsrfigjnsf", ""},
		{"with port, single part 63 chars long        ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjkndsrfigjnsf:3128", true, "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjkndsrfigjnsf", "3128"},
		{"no port, single part too long               ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjikndsrfigjnsf", false, "", ""},
		{"with port, single part too long             ", "4785tchn2w4g890hn-4t598-u2hxm08-u24htg0m82ug028u5gjikndsrfigjnsf:3128", false, "", ""},
		{"no port, two parts 1                        ", "e.ax", true, "e.ax", ""},
		{"with port, two parts 1                      ", "e.ax:3128", true, "e.ax", "3128"},
		{"with empty port, two parts 1                ", "e.ax:", false, "", ""},
		{"no port, two parts 2                        ", "ex.ample", true, "ex.ample", ""},
		{"with port, two parts 2                      ", "ex.ample:3128", true, "ex.ample", "3128"},
		{"with empty port, two parts 2                ", "ex.ample:", false, "", ""},
		{"with zero port, two parts 2                 ", "ex.ample:0", false, "", ""},
		{"with big port, two parts 2                  ", "ex.ample:65536", false, "", ""},
		{"no port, two parts, second starting with -  ", "ex.-ample", false, "", ""},
		{"with port, two parts, second starting with -", "ex.-ample:3128", false, "", ""},
		{"no port, two parts, one 63 chars long       ", "ex.mplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", true, "ex.mplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", ""},
		{"with port, two parts, one 63 chars long     ", "ex.mplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg:3128", true, "ex.mplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", "3128"},
		{"no port, two parts, one too long            ", "ex.amplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg", false, "", ""},
		{"with port, two parts, one too long          ", "ex.amplehasdifjhakdhfakjhdfgkajlfhgamplehasdifjhakdhfakjhdfgkajlfhg:3128", false, "", ""},
		{"no port, many parts                         ", "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", true, "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", ""},
		{"with port, many parts                       ", "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl:3128", true, "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", "3128"},
		{"no port, many parts                         ", "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", true, "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", ""},
		{"with port, many parts                       ", "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl:3128", true, "ex.a.m.p.l.e.h.a.s.d.i.f.j.h.a.k.d.h.f.a.k.j.h.d.fgk.ajl.fhgam.pl.eh.a.sdi.fjh.akdh.fa.kj.h.dfgkajlfhg.nl", "3128"},
		{"no port, comentario.app                     ", "comentario.app", true, "comentario.app", ""},
		{"with port, comentario.app                   ", "comentario.app:3128", true, "comentario.app", "3128"},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			if gotValid, gotHost, gotPort := IsValidHostPort(tt.s); gotValid != tt.wantValid || gotHost != tt.wantHost || gotPort != tt.wantPort {
				t.Errorf("IsValidHostPort() = (%v, %v, %v), want (%v, %v, %v)", gotValid, gotHost, gotPort, tt.wantValid, tt.wantHost, tt.wantPort)
			}
		})
	}
}

func TestIsValidPort(t *testing.T) {
	tests := []struct {
		name string
		str  string
		want bool
	}{
		{"empty string   ", "", false},
		{"alpha          ", "cc", false},
		{"alphanumeric 1 ", "a12", false},
		{"alphanumeric 2 ", "8f", false},
		{"zero           ", "0", false},
		{"too big number ", "65536", false},
		{"small number OK", "1", true},
		{"big number OK  ", "65535", true},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			if got := IsValidPort(tt.str); got != tt.want {
				t.Errorf("IsValidPort() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidURL(t *testing.T) {
	tests := []struct {
		name      string
		s         string
		allowHTTP bool
		want      bool
	}{
		{"http on, empty                   ", "", true, false},
		{"http off, empty                  ", "", false, false},
		{"http on, root path               ", "/", true, false},
		{"http off, root path              ", "/", false, false},
		{"http on, path only               ", "/path", true, false},
		{"http off, path only              ", "/path", false, false},
		{"http on, path#                   ", "/path#foo", true, false},
		{"http off, path#                  ", "/path#foo", false, false},
		{"http on, schemaless              ", "//example.org/path#foo", true, false},
		{"http off, schemaless             ", "//example.org/path#foo", false, false},
		{"http on, ftp URL root            ", "ftp://example.org/path#foo", true, false},
		{"http off, ftp URL root           ", "ftp://example.org/path#foo", false, false},
		{"http on, ftp URL path            ", "ftp://example.org/path", true, false},
		{"http off, ftp URL path           ", "ftp://example.org/path", false, false},
		{"http on, ftp URL path#           ", "ftp://example.org/path#foo", true, false},
		{"http off, ftp URL path#          ", "ftp://example.org/path#foo", false, false},
		{"http on, http URL root, no /     ", "http://example.org", true, true},
		{"http off, http URL root, no /    ", "http://example.org", false, false},
		{"http on, http URL root, no /, #  ", "http://example.org#foo", true, true},
		{"http off, http URL root, no /, # ", "http://example.org#foo", false, false},
		{"http on, http URL root           ", "http://example.org/", true, true},
		{"http off, http URL root          ", "http://example.org/", false, false},
		{"http on, http URL root, #        ", "http://example.org/#foo", true, true},
		{"http off, http URL root, #       ", "http://example.org/#foo", false, false},
		{"http on, http URL path           ", "http://example.org/path", true, true},
		{"http off, http URL path          ", "http://example.org/path", false, false},
		{"http on, http URL path,#         ", "http://example.org/path#foo", true, true},
		{"http off, http URL path,#        ", "http://example.org/path#foo", false, false},
		{"http on, http URL path,?,#       ", "http://example.org/path?param=value&x=42#foo", true, true},
		{"http off, http URL path,?,#      ", "http://example.org/path?param=value&x=42#foo", false, false},
		{"http on, https URL root          ", "https://example.org/path#foo", true, true},
		{"http off, https URL root         ", "https://example.org/path#foo", false, true},
		{"http on, https URL root, no /    ", "https://example.org", true, true},
		{"http off, https URL root, no /   ", "https://example.org", false, true},
		{"http on, https URL root, no /, # ", "https://example.org#foo", true, true},
		{"http off, https URL root, no /, #", "https://example.org#foo", false, true},
		{"http on, https URL root          ", "https://example.org/", true, true},
		{"http off, https URL root         ", "https://example.org/", false, true},
		{"http on, https URL path          ", "https://example.org/path", true, true},
		{"http off, https URL path         ", "https://example.org/path", false, true},
		{"http on, https URL path,?,#      ", "https://example.org/path?param=value&x=42#foo", true, true},
		{"http off, https URL path,?,#     ", "https://example.org/path?param=value&x=42#foo", false, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidURL(tt.s, tt.allowHTTP); got != tt.want {
				t.Errorf("IsValidURL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsUILang(t *testing.T) {
	tests := []struct {
		name string
		lang string
		want bool
	}{
		{"empty string", "", false},
		{"1 char", "e", false},
		{"3 chars", "ene", false},
		{"af is not", "af", false},
		{"am is not", "am", false},
		{"ar is not", "ar", false},
		{"az is not", "az", false},
		{"bg is not", "bg", false},
		{"bn is not", "bn", false},
		{"ca is not", "ca", false},
		{"cs is not", "cs", false},
		{"da is not", "da", false},
		{"de is not", "de", false},
		{"el is not", "el", false},
		{"en is supported", "en", true},
		{"es is not", "es", false},
		{"et is not", "et", false},
		{"fa is not", "fa", false},
		{"fi is not", "fi", false},
		{"fr is not", "fr", false},
		{"gu is not", "gu", false},
		{"he is not", "he", false},
		{"hi is not", "hi", false},
		{"hr is not", "hr", false},
		{"hu is not", "hu", false},
		{"hy is not", "hy", false},
		{"id is not", "id", false},
		{"is is not", "is", false},
		{"it is not", "it", false},
		{"ja is not", "ja", false},
		{"ka is not", "ka", false},
		{"kk is not", "kk", false},
		{"km is not", "km", false},
		{"kn is not", "kn", false},
		{"ko is not", "ko", false},
		{"ky is not", "ky", false},
		{"lo is not", "lo", false},
		{"lt is not", "lt", false},
		{"lv is not", "lv", false},
		{"mk is not", "mk", false},
		{"ml is not", "ml", false},
		{"mn is not", "mn", false},
		{"mr is not", "mr", false},
		{"ms is not", "ms", false},
		{"my is not", "my", false},
		{"ne is not", "ne", false},
		{"nl is not", "nl", false},
		{"no is not", "no", false},
		{"pa is not", "pa", false},
		{"pl is not", "pl", false},
		{"pt is not", "pt", false},
		{"ro is not", "ro", false},
		{"ru is not", "ru", false},
		{"si is not", "si", false},
		{"sk is not", "sk", false},
		{"sl is not", "sl", false},
		{"sq is not", "sq", false},
		{"sr is not", "sr", false},
		{"sv is not", "sv", false},
		{"sw is not", "sw", false},
		{"ta is not", "ta", false},
		{"te is not", "te", false},
		{"th is not", "th", false},
		{"tr is not", "tr", false},
		{"uk is not", "uk", false},
		{"ur is not", "ur", false},
		{"uz is not", "uz", false},
		{"vi is not", "vi", false},
		{"zh is not", "zh", false},
		{"zu is not", "zu", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsUILang(tt.lang); got != tt.want {
				t.Errorf("IsUILang() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMarkdownToHTML(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		want     string
	}{
		{"Bare text   ", "Foo", "<p>Foo</p>"},
		{"Paragraphs  ", "Foo\n\nBar", "<p>Foo</p>\n\n<p>Bar</p>"},
		{"Script      ", "XSS: <script src='http://example.com/script.js'></script> Foo", "<p>XSS:  Foo</p>"},
		{"Regular link", "Regular [Link](http://example.com)", "<p>Regular <a href=\"http://example.com\" rel=\"nofollow noopener\" target=\"_blank\">Link</a></p>"},
		{"XSS link    ", "XSS [Link](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pgo=)", "<p>XSS <tt>Link</tt></p>"},
		{"Image       ", "![Images disallowed](http://example.com/image.jpg)", "<p></p>"},
		{"Formatting  ", "**bold** *italics*", "<p><strong>bold</strong> <em>italics</em></p>"},
		{"URL         ", "http://example.com/autolink", "<p><a href=\"http://example.com/autolink\" rel=\"nofollow noopener\" target=\"_blank\">http://example.com/autolink</a></p>"},
		{"HTML        ", "<b>not bold</b>", "<p>not bold</p>"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Trim leading/trailing whitespace explicitly before comparing (because it doesn't matter in the resulting
			// HTML)
			if got := strings.TrimSpace(MarkdownToHTML(tt.markdown)); got != tt.want {
				t.Errorf("MarkdownToHTML() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRandomBytesLength(t *testing.T) {
	tests := []struct {
		name string
		len  int
	}{
		{"no bytes random buffer", 0},
		{"1 byte random buffer", 1},
		{"5 byte random buffer", 5},
		{"100 byte random buffer", 100},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if b, err := RandomBytes(tt.len); err != nil {
				t.Errorf("RandomBytes() errored with %v", err)
			} else if got := len(b); got != tt.len {
				t.Errorf("RandomBytes() length = %v, want %v", got, tt.len)
			}
		})
	}
}

func TestStripPort(t *testing.T) {
	tests := []struct {
		name     string
		hostname string
		want     string
	}{
		{"empty string                  ", "", ""},
		{"host only                     ", "google.org.co.uk", "google.org.co.uk"},
		{"host with port                ", "whatever.co.uk:23948", "whatever.co.uk"},
		{"host with non-digits a-la port", "whatever.co.uk:0m", "whatever.co.uk:0m"},
		{"garbage in garbage out        ", "SErc2%4G23Gb@t5g@x6hj4z<j37x3Q", "SErc2%4G23Gb@t5g@x6hj4z<j37x3Q"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := StripPort(tt.hostname); got != tt.want {
				t.Errorf("StripPort() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestToStringSlice(t *testing.T) {
	in := []strfmt.UUID{"foo", "", "bar"}
	want := []string{"foo", "", "bar"}
	t.Run("convert []strfmt.UUID", func(t *testing.T) {
		if got := ToStringSlice(in); !reflect.DeepEqual(got, want) {
			t.Errorf("ToStringSlice() = %v, want %v", got, want)
		}
	})
}
