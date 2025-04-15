package svc

import (
	"database/sql"
	"errors"
	"github.com/doug-martin/goqu/v9"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"time"
)

// TokenService is a service interface for dealing with Token objects
type TokenService interface {
	// Create persists a new token
	Create(t *data.Token) error
	// DeleteByValue deletes a token by its (string) value
	DeleteByValue(s string) error
	// FindByValue finds and returns a token by its (string) value
	FindByValue(s string, allowExpired bool) (*data.Token, error)
	// Update updates the token record in the database
	Update(t *data.Token) error
}

//----------------------------------------------------------------------------------------------------------------------

// tokenService is a blueprint TokenService implementation
type tokenService struct{ dbTxAware }

func (svc *tokenService) Create(t *data.Token) error {
	logger.Debugf("tokenService.Create(%#v)", t)

	// Insert a new record
	if err := persistence.ExecOne(svc.dbx().Insert("cm_tokens").Rows(t)); err != nil {
		return translateDBErrors("tokenService.Create/Insert", err)
	}

	// Succeeded
	return nil
}

func (svc *tokenService) DeleteByValue(s string) error {
	logger.Debugf("tokenService.DeleteByValue(%q)", s)

	// Delete the record
	err := persistence.ExecOne(svc.dbx().Delete("cm_tokens").Where(goqu.Ex{"value": s}))
	if errors.Is(err, sql.ErrNoRows) {
		// No rows affected
		return ErrBadToken
	} else if err != nil {
		// Any other error
		return translateDBErrors("tokenService.DeleteByValue/Delete", err)
	}

	// Succeeded
	return nil
}

func (svc *tokenService) FindByValue(s string, allowExpired bool) (*data.Token, error) {
	logger.Debugf("tokenService.FindByValue(%x, %v)", s, allowExpired)

	q := svc.dbx().From("cm_tokens").Where(goqu.Ex{"value": s})
	if !allowExpired {
		q = q.Where(goqu.C("ts_expires").Gt(time.Now().UTC()))
	}

	// Query the token
	var t data.Token
	if b, err := q.ScanStruct(&t); err != nil {
		return nil, translateDBErrors("tokenService.FindByValue/ScanStruct", err)
	} else if !b {
		return nil, ErrBadToken
	}

	// Succeeded
	return &t, nil
}

func (svc *tokenService) Update(t *data.Token) error {
	logger.Debugf("tokenService.Update(%v)", t)

	// Update the token record
	if err := persistence.ExecOne(svc.dbx().Update("cm_tokens").Set(t).Where(goqu.Ex{"value": t.Value})); err != nil {
		return translateDBErrors("tokenService.Update/Update", err)
	}

	// Succeeded
	return nil
}
