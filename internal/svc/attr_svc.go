package svc

import (
	"errors"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
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
	if svc.checkAnon && *ownerID == util.ZeroUUID {
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
	if svc.checkAnon && *ownerID == util.ZeroUUID {
		return errors.New("cannot set attributes for anonymous owner")
	}

	// Prepare a lookup condition
	where := goqu.Ex{svc.keyColName: ownerID, "key": key}

	// Value removal
	if value == "" {
		// We don't want to use ExecOne() here since the value may well not exist anymore, which we don't care about, so
		// simply nothing will be deleted
		if _, err := db.Delete(svc.tableName).Where(where).Executor().Exec(); err != nil {
			logger.Errorf("attrService.Set: Delete() failed for ownerID=%s, key=%s: %v", ownerID, key, err)
			return translateDBErrors(err)
		}
		return nil
	}

	// Insert or update the record
	a := &data.Attribute{
		Key:         key,
		Value:       value,
		UpdatedTime: time.Now().UTC(),
	}
	err := db.ExecOne(db.Insert(goqu.T(svc.tableName).As("t")).
		// Can't just pass a struct here since we depend on the variable key column name
		Rows(goqu.Record{svc.keyColName: ownerID, "key": a.Key, "value": a.Value, "ts_updated": a.UpdatedTime}).
		OnConflict(goqu.DoUpdate(svc.keyColName+",key", a)))
	if err != nil {
		logger.Errorf("attrService.Set: ExecOne() failed for ownerID=%s, key=%s: %v", ownerID, key, err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
