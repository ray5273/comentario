package svc

import (
	"encoding/hex"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// TheTokenService is a global TokenService implementation
var TheTokenService TokenService = &tokenService{}

// TokenService is a service interface for dealing with Token objects
type TokenService interface {
	// Create persists a new token
	Create(t *data.Token) error
	// DeleteByValue deletes a token by its binary value
	DeleteByValue(value []byte) error
	// FindByValue finds and returns a token by its binary value, or nil if not found
	FindByValue(value []byte, allowExpired bool) (*data.Token, error)
}

//----------------------------------------------------------------------------------------------------------------------

// tokenService is a blueprint TokenService implementation
type tokenService struct{}

func (svc *tokenService) Create(t *data.Token) error {
	logger.Debugf("tokenService.Create(%v)", t)

	// Insert a new record
	err := db.Exec(
		"insert into cm_tokens(value, user_id, scope, ts_expires, multiuse) values($1, $2, $3, $4, $5)",
		t.String(), t.Owner, t.Scope, t.ExpiresTime, t.Multiuse)
	if err != nil {
		logger.Errorf("tokenService.Create: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *tokenService) DeleteByValue(value []byte) error {
	logger.Debugf("tokenService.DeleteByValue(%x)", value)

	// Delete the record
	res, err := db.ExecRes("delete from cm_tokens where value=$1", hex.EncodeToString(value))
	if err != nil {
		logger.Errorf("tokenService.DeleteByValue: Exec() failed: %v", err)
		return translateDBErrors(err)
	} else if i, err := res.RowsAffected(); err != nil {
		logger.Errorf("tokenService.DeleteByValue: RowsAffected() failed: %v", err)
		return translateDBErrors(err)
	} else if i == 0 {
		// No rows affected
		return ErrBadToken
	}

	// Succeeded
	return nil
}

func (svc *tokenService) FindByValue(value []byte, allowExpired bool) (*data.Token, error) {
	logger.Debugf("tokenService.FindByValue(%x, %v)", value, allowExpired)

	// Prepare the query
	s := "select value, user_id, scope, ts_expires, multiuse from cm_tokens where value=$1"
	params := []any{hex.EncodeToString(value)}
	if !allowExpired {
		s += " and ts_expires>$2"
		params = append(params, time.Now().UTC())
	}

	// Query the token
	var v string
	var t data.Token
	row := db.QueryRow(s, params...)
	if err := row.Scan(&v, t.Owner, t.Scope, t.ExpiresTime, t.Multiuse); err != nil {
		logger.Errorf("tokenService.FindByValue: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	} else if t.Value, err = hex.DecodeString(v); err != nil {
		logger.Errorf("tokenService.FindByValue: DecodeString() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return &t, nil
}
