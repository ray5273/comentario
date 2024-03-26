package svc

import (
	"database/sql"
	"encoding/hex"
	"errors"
	"github.com/doug-martin/goqu/v9"
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
	// FindByStrValue finds and returns a token by its string value
	FindByStrValue(s string, allowExpired bool) (*data.Token, error)
	// FindByValue finds and returns a token by its binary value
	FindByValue(value []byte, allowExpired bool) (*data.Token, error)
	// Update updates the token record in the database
	Update(t *data.Token) error
}

//----------------------------------------------------------------------------------------------------------------------

// tokenService is a blueprint TokenService implementation
type tokenService struct{}

func (svc *tokenService) Create(t *data.Token) error {
	logger.Debugf("tokenService.Create(%v)", t)

	// Insert a new record
	if err := db.ExecuteOne(
		db.Dialect().
			Insert("cm_tokens").
			Rows(goqu.Record{
				"value":      t.String(),
				"user_id":    t.Owner,
				"scope":      t.Scope,
				"ts_expires": t.ExpiresTime,
				"multiuse":   t.Multiuse,
			}),
	); err != nil {
		logger.Errorf("tokenService.Create: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *tokenService) DeleteByValue(value []byte) error {
	logger.Debugf("tokenService.DeleteByValue(%x)", value)

	// Delete the record
	err := db.ExecuteOne(db.Dialect().Delete("cm_tokens").Where(goqu.Ex{"value": hex.EncodeToString(value)}))
	if errors.Is(err, sql.ErrNoRows) {
		// No rows affected
		return ErrBadToken
	} else if err != nil {
		// Any other error
		logger.Errorf("tokenService.DeleteByValue: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *tokenService) FindByStrValue(s string, allowExpired bool) (*data.Token, error) {
	logger.Debugf("tokenService.FindByStrValue(%x, %v)", s, allowExpired)

	// Try to parse the value
	if val, err := hex.DecodeString(s); err != nil || len(val) != 32 {
		return nil, ErrBadToken
	} else {
		return svc.FindByValue(val, allowExpired)
	}
}

func (svc *tokenService) FindByValue(value []byte, allowExpired bool) (*data.Token, error) {
	logger.Debugf("tokenService.FindByValue(%x, %v)", value, allowExpired)

	// Prepare the query
	q := db.Dialect().
		From("cm_tokens").
		Select("value", "user_id", "scope", "ts_expires", "multiuse").
		Where(goqu.Ex{"value": hex.EncodeToString(value)})
	if !allowExpired {
		q = q.Where(goqu.C("ts_expires").Gt(time.Now().UTC()))
	}

	// Query the token
	var v string
	var t data.Token
	if err := db.SelectRow(q).Scan(&v, &t.Owner, &t.Scope, &t.ExpiresTime, &t.Multiuse); err != nil {
		logger.Errorf("tokenService.FindByValue: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	} else if t.Value, err = hex.DecodeString(v); err != nil {
		logger.Errorf("tokenService.FindByValue: DecodeString() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return &t, nil
}

func (svc *tokenService) Update(t *data.Token) error {
	logger.Debugf("tokenService.Update(%v)", t)

	// Insert a new record
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_tokens").
			Set(goqu.Record{"user_id": t.Owner, "scope": t.Scope, "ts_expires": t.ExpiresTime, "multiuse": t.Multiuse}).
			Where(goqu.Ex{"value": t.String()}),
	); err != nil {
		logger.Errorf("tokenService.Update: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
