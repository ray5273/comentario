package svc

import (
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"time"
)

// AuthSessionService is a service interface for dealing with AuthSession objects
type AuthSessionService interface {
	// Create saves a new auth session
	Create(sessData, host, token string) (*data.AuthSession, error)
	// TakeByID returns and deletes an existing auth session by its ID
	TakeByID(id *uuid.UUID) (*data.AuthSession, error)
}

//----------------------------------------------------------------------------------------------------------------------

// authSessionService is a blueprint AuthSessionService implementation
type authSessionService struct{ dbTxAware }

func (svc *authSessionService) Create(sessData, host, token string) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.Create(%q, %q, %q)", sessData, host, token)

	// Create a session
	as := data.NewAuthSession(sessData, host, token)

	// Persist the session
	if err := persistence.ExecOne(svc.dbx().Insert("cm_auth_sessions").Rows(as)); err != nil {
		return nil, translateDBErrors("authSessionService.Create/Insert", err)
	}

	// Succeeded
	return as, nil
}

func (svc *authSessionService) TakeByID(id *uuid.UUID) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.TakeByID(%s)", id)

	// Query and delete the session
	var as data.AuthSession
	b, err := svc.dbx().Delete("cm_auth_sessions").
		Where(goqu.C("id").Eq(id), goqu.C("ts_expires").Gt(time.Now().UTC())).
		Returning("id", "token_value", "data", "host", "ts_created", "ts_expires").
		Executor().
		ScanStruct(&as)
	if err != nil {
		return nil, translateDBErrors("authSessionService.TakeByID/ScanStruct", err)
	} else if !b {
		return nil, ErrNotFound
	}

	// Succeeded
	return &as, nil
}
