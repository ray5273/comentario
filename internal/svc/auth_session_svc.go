package svc

import (
	"encoding/hex"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// TheAuthSessionService is a global AuthSessionService implementation
var TheAuthSessionService AuthSessionService = &authSessionService{}

// AuthSessionService is a service interface for dealing with AuthSession objects
type AuthSessionService interface {
	// Create saves a new auth session
	Create(sessData, host string, token []byte) (*data.AuthSession, error)
	// TakeByID returns and deletes an existing auth session by its ID
	TakeByID(id *uuid.UUID) (*data.AuthSession, error)
}

//----------------------------------------------------------------------------------------------------------------------

// authSessionService is a blueprint AuthSessionService implementation
type authSessionService struct{}

func (svc *authSessionService) Create(sessData, host string, token []byte) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.Create('%s', '%s')", sessData, host)

	// Create a session
	as := data.NewAuthSession(sessData, host, token)

	// Persist the session
	if err := db.ExecuteOne(
		db.Dialect().
			Insert("cm_auth_sessions").
			Rows(goqu.Record{
				"id":          &as.ID,
				"token_value": hex.EncodeToString(as.TokenValue),
				"data":        as.Data,
				"host":        as.Host,
				"ts_created":  as.CreatedTime,
				"ts_expires":  as.ExpiresTime,
			}).
			Prepared(true),
	); err != nil {
		logger.Errorf("authSessionService.Create: ExecuteOne() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return as, nil
}

func (svc *authSessionService) TakeByID(id *uuid.UUID) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.TakeByID(%s)", id)

	// Query and delete the session
	var as data.AuthSession
	var tv string
	err := db.QueryRow(
		"delete from cm_auth_sessions where id=$1 and ts_expires>$2 returning id, token_value, data, host, ts_created, ts_expires;",
		&id, time.Now().UTC(),
	).
		Scan(&as.ID, &tv, &as.Data, &as.Host, &as.CreatedTime, &as.ExpiresTime)
	if err != nil {
		logger.Errorf("authSessionService.TakeByID: QueryRow() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Decode the hex token value
	if as.TokenValue, err = hex.DecodeString(tv); err != nil {
		return nil, err
	}

	// Succeeded
	return &as, nil
}
