package svc

import (
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
)

// TheUserAttrService is a global UserAttrService implementation
var TheUserAttrService UserAttrService = &userAttrService{}

// UserAttrService is a service interface for dealing with user attributes
type UserAttrService interface {
	// GetAll returns all attributes of a user with the given ID
	GetAll(userID *uuid.UUID) (map[string]string, error)
}

//----------------------------------------------------------------------------------------------------------------------

// userAttrService is a blueprint UserAttrService implementation
type userAttrService struct{}

func (svc *userAttrService) GetAll(userID *uuid.UUID) (map[string]string, error) {
	logger.Debugf("userAttrService.GetAll(%s)", userID)

	// User cannot be anonymous
	if *userID == data.AnonymousUser.ID {
		return nil, ErrNotFound
	}

	// Query the database
	rows, err := db.Select(db.Dialect().From("cm_user_attrs").Select("key", "value").Where(goqu.Ex{"user_id": userID}))
	if err != nil {
		logger.Errorf("userAttrService.GetAll: Select() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the sessions
	res := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			logger.Errorf("userAttrService.GetAll: Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}
		res[k] = v
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("userAttrService.GetAll: rows.Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}
