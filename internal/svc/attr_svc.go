package svc

import (
	"errors"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/plugin"
	"time"
)

// TheUserAttrService is a global UserAttrService implementation
var TheUserAttrService plugin.UserAttrService = &attrService{tableName: "cm_user_attrs", keyColName: "user_id", checkAnon: true}

// TheDomainAttrService is a global DomainAttrService implementation
var TheDomainAttrService plugin.DomainAttrService = &attrService{tableName: "cm_domain_attrs", keyColName: "domain_id"}

//----------------------------------------------------------------------------------------------------------------------

// attrService is a generic attribute service implementation
type attrService struct {
	tableName  string // Name of the table storing attributes
	keyColName string // Name of the key column
	checkAnon  bool   // Whether to check for "anonymous" (zero-UUID) owner
}

func (svc *attrService) GetAll(ownerID *uuid.UUID) (map[string]string, error) {
	logger.Debugf("attrService.GetAll(%s)", ownerID)
	res := map[string]string{}

	// Anonymous owner has no attributes
	if svc.checkAnon && *ownerID == (uuid.UUID{}) {
		return res, nil
	}

	// Query the database
	rows, err := db.Select(db.Dialect().From(svc.tableName).Select("key", "value").Where(goqu.Ex{svc.keyColName: ownerID}))
	if err != nil {
		logger.Errorf("attrService.GetAll: Select() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the sessions
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			logger.Errorf("attrService.GetAll: Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}
		res[k] = v
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("attrService.GetAll: rows.Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}

func (svc *attrService) Set(ownerID *uuid.UUID, key, value string) error {
	logger.Debugf("attrService.Set(%s, %s, %s)", ownerID, key, value)

	// Anonymous owner cannot have attributes
	if svc.checkAnon && *ownerID == (uuid.UUID{}) {
		return errors.New("cannot set attributes for anonymous owner")
	}

	// Update the record
	q := db.Dialect().
		Update(svc.tableName).
		Set(goqu.Record{"value": value, "ts_updated": time.Now().UTC()}).
		Where(goqu.Ex{svc.keyColName: ownerID, "key": key})
	if err := db.ExecuteOne(q); err != nil {
		logger.Errorf("attrService.Set: ExecuteOne() failed for ownerID=%s, key=%s: %v", ownerID, key, err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
