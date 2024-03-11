package config

import (
	"net/url"
	"testing"
)

func TestKeySecret_Usable(t *testing.T) {
	tests := []struct {
		name    string
		disable bool
		key     string
		secret  string
		want    bool
	}{
		{"all empty              ", false, "", "", false},
		{"disabled, values empty ", true, "", "", false},
		{"enabled, key only      ", false, "SomeValue", "", false},
		{"enabled, secret only   ", false, "", "SomeValue", false},
		{"enabled, values filled ", false, "XYZ", "ABC", true},
		{"disabled, values filled", true, "XYZ", "ABC", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &KeySecret{Disable: tt.disable, Key: tt.key, Secret: tt.secret}
			if got := c.Usable(); got != tt.want {
				t.Errorf("Usable() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMaskIP(t *testing.T) {
	tests := []struct {
		name    string
		fullIPs bool
		ip      string
		want    string
	}{
		{"full on, empty     ", true, "", ""},
		{"full on, short IP  ", true, "2.2.2.2", "2.2.2.2"},
		{"full on, long IP   ", true, "255.255.255.255", "255.255.255.255"},
		{"full on, garbage   ", true, "Sunsets. Are red...", "Sunsets. Are red..."},
		{"full off, empty    ", false, "", ""},
		{"full off, short IP ", false, "2.2.2.2", "2.2.x.x"},
		{"full off, long IP  ", false, "255.255.255.255", "255.255.x.x"},
		{"full off, dot      ", false, ".", "."},
		{"full off, 2 dots   ", false, "..", "..x.x"},
		{"full off, 3 dots   ", false, "...", "..x.x"},
		{"full off, 4 dots   ", false, "....", "..x.x"},
		{"full off, 5 dots   ", false, ".....", "..x.x"},
		{"full off, garbage  ", false, "Sunsets. Are red...", "Sunsets. Are red.x.x"},
		{"full off, garbage2 ", false, "Whatever", "Whatever"},
		{"full off, unicode  ", false, "🥕.🥔.🍅.🍎.🍐.🍌", "🥕.🥔.x.x"},
		{"full off, mix chars", false, "\x00.🥔.\t.🍎.🍐.🍌", "\x00.🥔.x.x"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			CLIFlags.LogFullIPs = tt.fullIPs
			if got := MaskIP(tt.ip); got != tt.want {
				t.Errorf("MaskIP() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPathOfBaseURL(t *testing.T) {
	tests := []struct {
		name     string
		baseURL  string
		path     string
		wantOK   bool
		wantPath string
	}{
		{"domain root, empty        ", "http://api.test/", "", false, ""},
		{"domain root, root         ", "http://api.test/", "/", true, ""},
		{"subpath, empty            ", "http://api.test/some/path", "", false, ""},
		{"subpath, root             ", "http://api.test/some/path", "/", false, ""},
		{"subpath, same path, with /", "http://api.test/some/path", "/some/path", true, ""},
		{"subpath, same path, no /  ", "http://api.test/some/path", "some/path", false, ""},
		{"subpath, deep path, with /", "http://api.test/some/path", "/some/path/subpath", true, "subpath"},
		{"subpath, deep path, no /  ", "http://api.test/some/path", "some/path/subpath", false, ""},
	}
	for _, tt := range tests {
		var err error
		if BaseURL, err = url.Parse(tt.baseURL); err != nil {
			t.Errorf("PathOfBaseURL(): failed to parse base URL: %v", err)
		}
		t.Run(tt.name, func(t *testing.T) {
			gotOK, gotPath := PathOfBaseURL(tt.path)
			if gotOK != tt.wantOK {
				t.Errorf("PathOfBaseURL() got OK = %v, want %v", gotOK, tt.wantOK)
			}
			if gotPath != tt.wantPath {
				t.Errorf("PathOfBaseURL() got path = %v, want %v", gotPath, tt.wantPath)
			}
		})
	}
}

func TestURLFor(t *testing.T) {
	tests := []struct {
		name        string
		base        string
		path        string
		queryParams map[string]string
		want        string
	}{
		{"Root, no params ", "http://ace.of.base:1234", "", nil, "http://ace.of.base:1234/"},
		{"Root with params", "http://basics/", "", map[string]string{"foo": "bar"}, "http://basics/?foo=bar"},
		{"Path, no params ", "https://microsoft.qq:14/", "user/must/suffer", nil, "https://microsoft.qq:14/user/must/suffer"},
		{"Path with params", "https://yellow/submarine", "strawberry/fields", map[string]string{"baz": "   "}, "https://yellow/submarine/strawberry/fields?baz=+++"},
	}
	for _, tt := range tests {
		var err error
		t.Run(tt.name, func(t *testing.T) {
			BaseURL, err = url.Parse(tt.base)
			if err != nil {
				panic(err)
			}
			if got := URLFor(tt.path, tt.queryParams); got != tt.want {
				t.Errorf("URLFor() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestURLForAPI(t *testing.T) {
	tests := []struct {
		name        string
		base        string
		path        string
		queryParams map[string]string
		want        string
	}{
		{"Root, no params ", "http://ace.of.base:1234", "", nil, "http://ace.of.base:1234/api/"},
		{"Root with params", "http://basics/", "", map[string]string{"foo": "bar"}, "http://basics/api/?foo=bar"},
		{"Path, no params ", "https://microsoft.qq:14/", "user/must/suffer", nil, "https://microsoft.qq:14/api/user/must/suffer"},
		{"Path with params", "https://yellow/submarine", "strawberry/fields", map[string]string{"baz": "   "}, "https://yellow/submarine/api/strawberry/fields?baz=+++"},
	}
	for _, tt := range tests {
		var err error
		t.Run(tt.name, func(t *testing.T) {
			BaseURL, err = url.Parse(tt.base)
			if err != nil {
				panic(err)
			}
			if got := URLForAPI(tt.path, tt.queryParams); got != tt.want {
				t.Errorf("URLForAPI() = %v, want %v", got, tt.want)
			}
		})
	}
}
