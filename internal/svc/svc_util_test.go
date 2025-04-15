package svc

import (
	"database/sql"
	"errors"
	"testing"
)

func Test_translateDBErrors(t *testing.T) {
	tests := []struct {
		name    string
		errs    []error
		wantErr error
	}{
		{"No error", nil, nil},
		{"Empty errors", []error{}, nil},
		{"Multiple nils", []error{nil, nil, nil, nil, nil, nil, nil}, nil},
		{"NotFound error", []error{sql.ErrNoRows}, ErrNotFound},
		{"Other DB error", []error{sql.ErrConnDone}, ErrDB},
		{"Custom error", []error{errors.New("ouch")}, ErrDB},
		{"Multiple errors", []error{errors.New("ouch"), sql.ErrNoRows, sql.ErrConnDone}, ErrDB},
		{"Mix of nils and errors", []error{nil, nil, nil, nil, nil, nil, nil, sql.ErrNoRows, nil}, ErrNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			//goland:noinspection GoDirectComparisonOfErrors
			if err := translateDBErrors("test", tt.errs...); err != tt.wantErr {
				t.Errorf("translateDBErrors() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}
