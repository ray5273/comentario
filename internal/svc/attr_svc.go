package svc

import (
	"context"
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jellydator/ttlcache/v3"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/extend/intf"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"maps"
	"time"
)

const (
	MaxAttrKeyLength   = 255  // Maximum length allowed for an attribute key
	MaxAttrValueLength = 4096 // Maximum length allowed for an attribute value
)

//----------------------------------------------------------------------------------------------------------------------

// attrStore is a generic attribute store implementation, whose methods require a database executor (DBX) in order to
// communicate with the database
type attrStore struct {
	cache      *ttlcache.Cache[uuid.UUID, intf.AttrValues] // Attribute caches per owner ID
	tableName  string                                      // Name of the table storing attributes
	keyColName string                                      // Name of the key column
	checkAnon  bool                                        // Whether to check for "anonymous" (zero-UUID) owner
}

// newAttrStore returns a new attrStore implementation, which uses the given underlying database table and key column
func newAttrStore(tableName, keyColName string, checkAnonymous bool) *attrStore {
	as := &attrStore{
		cache: ttlcache.New[uuid.UUID, intf.AttrValues](
			ttlcache.WithTTL[uuid.UUID, intf.AttrValues](util.AttrCacheTTL)),
		tableName:  tableName,
		keyColName: keyColName,
		checkAnon:  checkAnonymous,
	}

	// Debug logging
	if logger.IsEnabledFor(logging.DEBUG) {
		as.cache.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, i *ttlcache.Item[uuid.UUID, intf.AttrValues]) {
			logger.Debugf("attrStore: evicted %s, reason=%d", i.Key(), reason)
		})
	}

	// Start the cache cleaner
	go as.cache.Start()
	return as
}

// findByAttrValue finds and returns owner IDs that have the given attribute key-value pair
func (as *attrStore) findByAttrValue(dbx persistence.DBX, key, value string) ([]uuid.UUID, error) {
	logger.Debugf("attrStore.findByAttrValue(%v, %q, %q)", dbx, key, value)
	var res []uuid.UUID
	if err := dbx.From(as.tableName).Select(as.keyColName).Where(goqu.Ex{"key": key, "value": value}).ScanVals(&res); err != nil {
		return nil, translateDBErrors("attrStore.findByAttrValue/ScanVals", err)
	}
	return res, nil
}

// getAll returns all attributes of an owner with the given ID
func (as *attrStore) getAll(dbx persistence.DBX, ownerID *uuid.UUID) (intf.AttrValues, error) {
	logger.Debugf("attrStore.getAll(%v, %s)", dbx, ownerID)

	// Anonymous owner has no attributes
	if as.checkAnon && *ownerID == util.ZeroUUID {
		return intf.AttrValues{}, nil
	}

	// Try to find a cached item
	if ci := as.cache.Get(*ownerID); ci != nil {
		// Cache hit: return a *copy* of the original map
		return maps.Clone(ci.Value()), nil
	}

	// Cache miss: create a new store
	// NB: we cannot use ttlcache.WithLoader()/ttlcache.LoaderFunc because they don't support returning an error
	logger.Debugf("attrStore.getAll: cache miss for %s", ownerID)

	// Query the database
	var attrs []data.Attribute
	if err := dbx.From(as.tableName).Where(goqu.Ex{as.keyColName: ownerID}).ScanStructs(&attrs); err != nil {
		return nil, translateDBErrors("attrStore.getAll/ScanStructs", err)
	}

	// Convert the slice into a map
	m := intf.AttrValues{}
	for _, a := range attrs {
		m[a.Key] = a.Value
	}

	// Succeeded: cache the values, then return a copy of the map
	as.cache.Set(*ownerID, m, ttlcache.DefaultTTL)
	return maps.Clone(m), nil
}

// resetCache drops any cached values for the given owner
func (as *attrStore) resetCache(ownerID *uuid.UUID) {
	logger.Debugf("attrStore.resetCache(%s)", ownerID)
	as.cache.Delete(*ownerID)
}

// set given attribute values for the given owner by key
func (as *attrStore) set(dbx persistence.DBX, ownerID *uuid.UUID, attr intf.AttrValues) error {
	logger.Debugf("attrStore.set(%v, %s, %v)", dbx, ownerID, attr)

	// Anonymous owner cannot have attributes
	if as.checkAnon && *ownerID == util.ZeroUUID {
		return errors.New("cannot set attributes for anonymous owner")
	}

	// Validate lengths
	for k, v := range attr {
		// Validate the resulting key length
		if l := len(k); l > MaxAttrKeyLength {
			return fmt.Errorf("cannot set attribute (key=%q): key is too long: %d bytes, %d allowed", k, l, MaxAttrKeyLength)
		}

		// Validate the value length
		if l := len(v); l > MaxAttrValueLength {
			return fmt.Errorf("cannot set attribute (key=%q): value is too long: %d bytes, %d allowed", k, l, MaxAttrValueLength)
		}
	}

	// Fetch all existing values
	cachedAttrs, err := as.getAll(dbx, ownerID)
	if err != nil {
		return err
	}

	// Iterate the values
	for key, value := range attr {
		// Value removal
		if value == "" {
			// We don't want to use ExecOne() here since the value may well not exist anymore, which we don't care
			// about, so simply nothing will be deleted
			if _, err := dbx.Delete(as.tableName).Where((goqu.Ex{as.keyColName: ownerID, "key": key})).Executor().Exec(); err != nil {
				return translateDBErrors(fmt.Sprintf("attrStore.set/Delete[ownerID=%s, key=%q]", ownerID, key), err)
			}

			// Delete the value from the cache
			delete(cachedAttrs, key)

			// Proceed to the next entry
			continue
		}

		// Insert or update the record
		a := &data.Attribute{Key: key, Value: value, UpdatedTime: time.Now().UTC()}
		err := persistence.ExecOne(dbx.Insert(goqu.T(as.tableName).As("t")).
			// Can't just pass a struct here since we depend on the variable key column name
			Rows(goqu.Record{as.keyColName: ownerID, "key": a.Key, "value": a.Value, "ts_updated": a.UpdatedTime}).
			OnConflict(goqu.DoUpdate(as.keyColName+",key", a)))
		if err != nil {
			return translateDBErrors(fmt.Sprintf("attrStore.set/Insert[ownerID=%s, key=%q]", ownerID, key), err)
		}

		// Also set the cached value
		cachedAttrs[key] = value
	}

	// Succeeded: cache the values
	as.cache.Set(*ownerID, cachedAttrs, ttlcache.DefaultTTL)
	return nil
}

//----------------------------------------------------------------------------------------------------------------------

// txAttrStore is a transaction-aware attribute store implementation, which makes use of an underlying non-transactional
// store
type txAttrStore struct {
	dbTxAware
	s    *attrStore         // Underlying (database-backed) attribute store
	oIDs map[uuid.UUID]bool // Set of owner IDs, whose values were changed during the transaction
}

// newTxAttrStore returns a new transactional attribute store implementation based on the given underlying attrStore
func newTxAttrStore(as *attrStore, tx *persistence.DatabaseTx, db *persistence.Database) *txAttrStore {
	s := &txAttrStore{
		dbTxAware: dbTxAware{tx: tx, db: db},
		s:         as,
		oIDs:      map[uuid.UUID]bool{},
	}

	// Add the store as a child to the transaction, if any
	if tx != nil {
		tx.AddChild(s)
	}
	return s
}

func (a *txAttrStore) Commit() error {
	// Nothing to do here
	return nil
}

func (a *txAttrStore) Rollback() error {
	// Reset caches of the changed owners so they'll be restored in their original form with the next
	// FindByAttrValue/GetAll
	for id := range a.oIDs {
		a.s.resetCache(&id)
	}
	return nil
}

func (a *txAttrStore) FindByAttrValue(key, value string) ([]uuid.UUID, error) {
	// Delegate to the underlying store
	return a.s.findByAttrValue(a.dbx(), key, value)
}

func (a *txAttrStore) GetAll(ownerID *uuid.UUID) (intf.AttrValues, error) {
	// Delegate to the underlying store
	return a.s.getAll(a.dbx(), ownerID)
}

func (a *txAttrStore) Set(ownerID *uuid.UUID, attr intf.AttrValues) error {
	// Make a note of the owner ID so that we'll know something's changed for them, and can reset the cache should the
	// transaction be rolled back
	a.oIDs[*ownerID] = true

	// Delegate to the underlying store
	return a.s.set(a.dbx(), ownerID, attr)
}
