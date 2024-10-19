package svc

import (
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// TheUserAttrService is a global, unprefixed user attribute store
var TheUserAttrService = NewAttrStore("", "cm_user_attrs", "user_id", true)

// TheDomainAttrService is a global, unprefixed domain attribute store
var TheDomainAttrService = NewAttrStore("", "cm_domain_attrs", "domain_id", false)

const (
	MaxAttrKeyLength   = 255  // Maximum length allowed for an attribute key
	MaxAttrValueLength = 4096 // Maximum length allowed for an attribute value
)

// NewAttrStore returns a new AttrStore implementation
func NewAttrStore(prefix, tableName, keyColName string, checkAnonymous bool) plugin.AttrStore {
	return &attrStore{
		prefix:     prefix,
		tableName:  tableName,
		keyColName: keyColName,
		checkAnon:  checkAnonymous,
	}
}

//----------------------------------------------------------------------------------------------------------------------

// attrStore is a generic attribute store implementation
type attrStore struct {
	prefix     string // Optional key prefix
	tableName  string // Name of the table storing attributes
	keyColName string // Name of the key column
	checkAnon  bool   // Whether to check for "anonymous" (zero-UUID) owner
}

func (as *attrStore) GetAll(ownerID *uuid.UUID) (map[string]string, error) {
	logger.Debugf("attrStore.GetAll(%s)", ownerID)
	res := map[string]string{}

	// Anonymous owner has no attributes
	if as.checkAnon && *ownerID == util.ZeroUUID {
		return res, nil
	}

	// Prepare a filter condition
	where := as.addPrefixCondition(goqu.Ex{as.keyColName: ownerID})

	// Query the database
	var attrs []data.Attribute
	if err := db.From(as.tableName).Where(where).ScanStructs(&attrs); err != nil {
		logger.Errorf("attrStore.GetAll: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert the slice into a map
	for _, a := range attrs {
		res[a.Key] = a.Value
	}

	// Succeeded
	return res, nil
}

func (as *attrStore) Set(ownerID *uuid.UUID, attr map[string]string, clean bool) error {
	logger.Debugf("attrStore.Set(%s, %v, %v)", ownerID, attr, clean)

	// Anonymous owner cannot have attributes
	if as.checkAnon && *ownerID == util.ZeroUUID {
		return errors.New("cannot set attributes for anonymous owner")
	}

	// Validate lengths
	for k, v := range attr {
		// Prepend the key with the prefix, if any
		k = as.prefix + k

		// Validate the resulting key length
		if l := len(k); l > MaxAttrKeyLength {
			return fmt.Errorf("cannot set attribute (key=%q): key is too long: %d bytes, %d allowed", k, l, MaxAttrKeyLength)
		}

		// Validate the value length
		if l := len(v); l > MaxAttrValueLength {
			return fmt.Errorf("cannot set attribute (key=%q): value is too long: %d bytes, %d allowed", k, l, MaxAttrValueLength)
		}
	}

	// Clean up, if necessary
	if clean {
		if _, err := db.Delete(as.tableName).Where(as.addPrefixCondition(goqu.Ex{})).Executor().Exec(); err != nil {
			logger.Errorf("attrStore.Set: cleaning failed for ownerID=%s, prefix=%q: %v", ownerID, as.prefix, err)
			return translateDBErrors(err)
		}
	}

	// Iterate the values
	for key, value := range attr {
		// Prepend the key with the prefix, if any
		prefixedKey := as.prefix + key

		// Value removal. Only necessary if the values weren't cleaned beforehand
		if value == "" && !clean {
			// We don't want to use ExecOne() here since the value may well not exist anymore, which we don't care
			// about, so simply nothing will be deleted
			if _, err := db.Delete(as.tableName).Where((goqu.Ex{as.keyColName: ownerID, "key": prefixedKey})).Executor().Exec(); err != nil {
				logger.Errorf("attrStore.Set: Delete() failed for ownerID=%s, prefix=%q, key=%q: %v", ownerID, as.prefix, key, err)
				return translateDBErrors(err)
			}
			return nil
		}

		// Insert or update the record
		a := &data.Attribute{
			Key:         prefixedKey,
			Value:       value,
			UpdatedTime: time.Now().UTC(),
		}
		err := db.ExecOne(db.Insert(goqu.T(as.tableName).As("t")).
			// Can't just pass a struct here since we depend on the variable key column name
			Rows(goqu.Record{as.keyColName: ownerID, "key": a.Key, "value": a.Value, "ts_updated": a.UpdatedTime}).
			OnConflict(goqu.DoUpdate(as.keyColName+",key", a)))
		if err != nil {
			logger.Errorf("attrStore.Set: ExecOne() failed for ownerID=%s, prefix=%q, key=%q: %v", ownerID, as.prefix, key, err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil
}

// addPrefixCondition adds a prefix condition to restrict keys in scope, to the given WHERE clause, if necessary
func (as *attrStore) addPrefixCondition(ex goqu.Ex) goqu.Ex {
	if as.prefix != "" {
		// Restrict the query by only allowing keys starting with the prefix
		ex["key"] = goqu.C("key").Like(as.prefix + "%")
	}
	return ex
}
