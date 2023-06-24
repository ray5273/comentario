package persistence

import (
	"reflect"
	"testing"
)

func TestDatabase_parseMetadata(t *testing.T) {
	tests := []struct {
		name    string
		text    string
		want    map[string]string
		wantErr bool
	}{
		{"empty                          ", "", map[string]string{}, false},
		{"linebreaks                     ", "\n\n\n\n\n\n\n", map[string]string{}, false},
		{"linebreaks + whitespace        ", "\n\t\n  \n\t\t \n    \n\t", map[string]string{}, false},
		{"1-line comment                 ", "--", map[string]string{}, false},
		{"1-line non-comment             ", "foo", map[string]string{}, false},
		{"1-line meta                    ", "--@meta foo=bar", map[string]string{"foo": "bar"}, false},
		{"1-line empty meta              ", "--@meta", nil, true},
		{"1-line empty meta + whitespace ", "--  \t\t@meta  \t\t", nil, true},
		{"1-line non-meta                ", "--@metamorphose", map[string]string{}, false},
		{"1-line meta invalid            ", "--@meta morphose", nil, true},
		{"1-line meta + whitespace       ", "-- \t\t@meta     \t   foo \t=   bar\t\t  ", map[string]string{"foo": "bar"}, false},
		{"2-line comment                 ", "--\n--foo", map[string]string{}, false},
		{"2-line non-comment             ", "foo\nbar", map[string]string{}, false},
		{"2-line non-comment, trailing LF", "foo\nbar", map[string]string{}, false},
		{"2-line non-meta                ", "--@metamorphose\n--@metamphetamine", map[string]string{}, false},
		{"2-line meta invalid            ", "--@meta morphose\n@meta k=v", nil, true},
		{"multiline mixed                ", "--foo\n--bar\nbax\nbuzz\n", map[string]string{}, false},
		{"multiline meta + invalid name  ", "--@meta foo=1\n-- @meta bar-25=4\n", nil, true},
		{"multiline meta + missing value ", "--@meta foo=1\n-- @meta bar=\n", nil, true},
		{"multiline meta                 ", "--@meta   foo =14 \n--  @meta bar_25 =\twhat_ever-42+897~{}!@  \t \n--\n--meta comment\n\nbax\nbuzz\n", map[string]string{"foo": "14", "bar_25": "what_ever-42+897~{}!@"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := &Database{}
			if got, err := db.parseMetadata([]byte(tt.text)); (err != nil) != tt.wantErr {
				t.Errorf("parseMetadata() error = %v, want error = %v", err, tt.wantErr)
			} else if err == nil && !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseMetadata() got = %v, want %v", got, tt.want)
			}
		})
	}
}
