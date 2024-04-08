package data

import (
	"strings"
	"testing"
)

func TestDynConfigItem_AsBool(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{"empty  ", "", false},
		{"true   ", "true", true},
		{"false  ", "false", false},
		{"garbage", "@%^", false},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			ci := &DynConfigItem{Value: tt.value}
			if got := ci.AsBool(); got != tt.want {
				t.Errorf("AsBool() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDynConfigItem_AsInt(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		defValue string
		min      int
		max      int
		want     int
	}{
		{"empty value, empty default                  ", "", "", 0, 999, 0},
		{"invalid value, invalid default              ", "foo", "bar", 0, 999, 0},
		{"invalid value, valid default                ", "foo", "42", 0, 999, 42},
		{"valid value, valid default                  ", "16", "42", 0, 999, 16},
		{"negative value, valid default               ", "-10", "42", -999, 999, -10},
		{"invalid value, invalid default, negative min", "foo", "bar", -517, 999, -517},
		{"invalid value, valid default < min          ", "foo", "42", 50, 999, 50},
		{"valid value < min, valid default < min      ", "16", "142", 50, 999, 50},
		{"invalid value, valid default > max          ", "foo", "1042", 50, 999, 999},
		{"valid value > max, valid default > max      ", "500016", "242", 50, 999, 999},
	}
	for _, tt := range tests {
		t.Run(strings.TrimSpace(tt.name), func(t *testing.T) {
			ci := &DynConfigItem{Value: tt.value, DefaultValue: tt.defValue, Min: tt.min, Max: tt.max}
			if got := ci.AsInt(); got != tt.want {
				t.Errorf("AsInt() = %v, want %v", got, tt.want)
			}
		})
	}
}
