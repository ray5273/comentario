package svc

import (
	"errors"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/data"
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
	var attrs []data.Attribute
	if err := db.From(svc.tableName).Where(goqu.Ex{svc.keyColName: ownerID}).ScanStructs(&attrs); err != nil {
		logger.Errorf("attrService.GetAll: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert the slice into a map
	for _, a := range attrs {
		res[a.Key] = a.Value
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
	a := &data.Attribute{
		Key:         key,
		Value:       value,
		UpdatedTime: time.Now().UTC(),
	}
	if err := db.ExecOne(db.Update(svc.tableName).Set(a).Where(goqu.Ex{svc.keyColName: ownerID, "key": key})); err != nil {
		logger.Errorf("attrService.Set: ExecOne() failed for ownerID=%s, key=%s: %v", ownerID, key, err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
