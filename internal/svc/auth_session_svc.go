package svc

import (
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// TheAuthSessionService is a global AuthSessionService implementation
var TheAuthSessionService AuthSessionService = &authSessionService{}

// AuthSessionService is a service interface for dealing with AuthSession objects
type AuthSessionService interface {
	// Create saves a new auth session
	Create(sessData, sourceURL string) (*data.AuthSession, error)
	// TakeByID returns and deletes an existing auth session by its ID
	TakeByID(id *uuid.UUID) (*data.AuthSession, error)
}

//----------------------------------------------------------------------------------------------------------------------

// authSessionService is a blueprint AuthSessionService implementation
type authSessionService struct{}

func (svc *authSessionService) Create(sessData, sourceURL string) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.Create(%s)", sessData)

	// Create a session
	as := data.NewAuthSession(sessData, sourceURL)

	// Persist the session
	err := db.Exec(
		"insert into cm_auth_sessions(id, data, source_url, ts_created, ts_expires) values($1, $2, $3, $4, $5)",
		&as.ID, as.Data, as.SourceURL, as.CreatedTime, as.ExpiresTime)
	if err != nil {
		logger.Errorf("authSessionService.Create: Exec() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return as, nil
}

func (svc *authSessionService) TakeByID(id *uuid.UUID) (*data.AuthSession, error) {
	logger.Debugf("authSessionService.TakeByID(%v)", id)

	// Query and delete the session
	var as data.AuthSession
	err := db.QueryRow(
		"delete from cm_auth_sessions where id=$1 and ts_expires>$2 returning id, data, source_url, ts_created, ts_expires",
		&id, time.Now().UTC(),
	).
		Scan(&as.ID, &as.Data, &as.SourceURL, &as.CreatedTime, &as.ExpiresTime)
	if err != nil {
		logger.Errorf("authSessionService.TakeByID: QueryRow() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &as, nil
}
