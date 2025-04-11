package svc

import (
	"context"
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jellydator/ttlcache/v3"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"maps"
	"slices"
	"time"
)

const (
	MaxAttrKeyLength   = 255  // Maximum length allowed for an attribute key
	MaxAttrValueLength = 4096 // Maximum length allowed for an attribute value
)

// newAttrStore returns a new attrStore implementation
func newAttrStore(tableName, keyColName string, checkAnonymous bool) *attrStore {
	as := &attrStore{
		cache: ttlcache.New[uuid.UUID, plugin.AttrValues](
			ttlcache.WithTTL[uuid.UUID, plugin.AttrValues](util.AttrCacheTTL)),
		tableName:  tableName,
		keyColName: keyColName,
		checkAnon:  checkAnonymous,
	}

	// Debug logging
	if logger.IsEnabledFor(logging.DEBUG) {
		as.cache.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, i *ttlcache.Item[uuid.UUID, plugin.AttrValues]) {
			logger.Debugf("attrStore: evicted %s, reason=%d", i.Key(), reason)
		})
	}

	// Start the cache cleaner
	go as.cache.Start()
	return as
}

// newTxAttrStore returns a new transactional attribute store implementation based on the given underlying attrStore
func newTxAttrStore(as *attrStore, tx *persistence.DatabaseTx) *txAttrStore {
	s := &txAttrStore{s: as}

	// Add the store as a child to the transaction
	tx.AddChild(s)
	return s
}

//----------------------------------------------------------------------------------------------------------------------

// txAttrStore is a blueprint attribute service implementation, which makes use of an underlying attribute store
type txAttrStore struct {
	s *attrStore                      // Underlying (database-backed) attribute store
	v map[uuid.UUID]plugin.AttrValues // Overridden values
}

func (a *txAttrStore) Commit() error {
	// Apply all set values, if any, to the underlying store
	if a.v != nil {
		for id, av := range a.v {
			if err := a.s.Set(&id, av); err != nil {
				return err
			}
		}

		// Cleanup the overrides
		a.v = nil
	}
	return nil
}

func (a *txAttrStore) Rollback() error {
	// Do nothing: the underlying store remains unchanged
	return nil
}

func (a *txAttrStore) FindByAttrValue(key, value string) ([]uuid.UUID, error) {
	// Query the underlying store first and convert the result into a set
	rs := map[uuid.UUID]bool{}
	if r, err := a.s.FindByAttrValue(key, value); err != nil {
		return nil, err
	} else {
		for _, id := range r {
			rs[id] = true
		}
	}

	// Search for any matches in the overrides
	if a.v != nil {
		for id, av := range a.v {
			if rs[id] {
				// If there was a match, but not anymore, remove the key from the set
				if av[key] != value {
					delete(rs, id)
				}

			} else if av[key] == value {
				// There's a new match: add the key
				rs[id] = true
			}
		}
	}

	// Collect the keys (IDs)
	return slices.Collect(maps.Keys(rs)), nil
}

func (a *txAttrStore) GetAll(ownerID *uuid.UUID) (plugin.AttrValues, error) {
	// Query the underlying store first
	r, err := a.s.GetAll(ownerID)
	if err != nil {
		return nil, err
	}

	// Apply any overrides
	if a.v != nil {
		if av, ok := a.v[*ownerID]; ok {
			maps.Copy(r, av)
		}
	}
	return r, nil
}

func (a *txAttrStore) Set(ownerID *uuid.UUID, attr plugin.AttrValues) error {
	// Create an override map if none yet
	if a.v != nil {
		a.v = make(map[uuid.UUID]plugin.AttrValues)
	}

	// Create an AttrValues map if none yet for this owner
	av := a.v[*ownerID]
	if av == nil {
		av = make(plugin.AttrValues)
		a.v[*ownerID] = av
	}

	// Store the value(s) as an override
	maps.Copy(av, attr)
	return nil
}

//----------------------------------------------------------------------------------------------------------------------

// attrStore is a generic attribute store implementation
type attrStore struct {
	cache      *ttlcache.Cache[uuid.UUID, plugin.AttrValues] // Attribute caches per owner ID
	tableName  string                                        // Name of the table storing attributes
	keyColName string                                        // Name of the key column
	checkAnon  bool                                          // Whether to check for "anonymous" (zero-UUID) owner
}

func (as *attrStore) FindByAttrValue(key, value string) ([]uuid.UUID, error) {
	logger.Debugf("attrStore.FindByAttrValue(%q, %q)", key, value)
	var res []uuid.UUID
	if err := db.From(as.tableName).Select(as.keyColName).Where(goqu.Ex{"key": key, "value": value}).ScanVals(&res); err != nil {
		logger.Errorf("attrStore.FindByAttrValue: ScanVals() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	return res, nil
}

func (as *attrStore) GetAll(ownerID *uuid.UUID) (plugin.AttrValues, error) {
	logger.Debugf("attrStore.GetAll(%s)", ownerID)

	// Anonymous owner has no attributes
	if as.checkAnon && *ownerID == util.ZeroUUID {
		return plugin.AttrValues{}, nil
	}

	// Try to find a cached item
	if ci := as.cache.Get(*ownerID); ci != nil {
		// Cache hit: return a *copy* of the original map
		return maps.Clone(ci.Value()), nil
	}

	// Cache miss: create a new store
	// NB: we cannot use ttlcache.WithLoader()/ttlcache.LoaderFunc because they don't support returning an error
	logger.Debugf("attrStore.GetAll: cache miss for %s", ownerID)

	// Query the database
	var attrs []data.Attribute
	if err := db.From(as.tableName).Where(goqu.Ex{as.keyColName: ownerID}).ScanStructs(&attrs); err != nil {
		logger.Errorf("attrStore.GetAll: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert the slice into a map
	m := plugin.AttrValues{}
	for _, a := range attrs {
		m[a.Key] = a.Value
	}

	// Succeeded: cache the values, then return a copy of the map
	as.cache.Set(*ownerID, m, ttlcache.DefaultTTL)
	return maps.Clone(m), nil
}

func (as *attrStore) Set(ownerID *uuid.UUID, attr plugin.AttrValues) error {
	logger.Debugf("attrStore.Set(%s, %v)", ownerID, attr)

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
	cachedAttrs, err := as.GetAll(ownerID)
	if err != nil {
		return err
	}

	// Iterate the values
	for key, value := range attr {
		// Value removal
		if value == "" {
			// We don't want to use ExecOne() here since the value may well not exist anymore, which we don't care
			// about, so simply nothing will be deleted
			if _, err := db.Delete(as.tableName).Where((goqu.Ex{as.keyColName: ownerID, "key": key})).Executor().Exec(); err != nil {
				logger.Errorf("attrStore.Set: Delete() failed for ownerID=%s, key=%q: %v", ownerID, key, err)
				return translateDBErrors(err)
			}

			// Delete the value from the cache
			delete(cachedAttrs, key)

			// Proceed to the next entry
			continue
		}

		// Insert or update the record
		a := &data.Attribute{Key: key, Value: value, UpdatedTime: time.Now().UTC()}
		err := execOne(db.Insert(goqu.T(as.tableName).As("t")).
			// Can't just pass a struct here since we depend on the variable key column name
			Rows(goqu.Record{as.keyColName: ownerID, "key": a.Key, "value": a.Value, "ts_updated": a.UpdatedTime}).
			OnConflict(goqu.DoUpdate(as.keyColName+",key", a)))
		if err != nil {
			logger.Errorf("attrStore.Set: ExecOne() failed for ownerID=%s, key=%q: %v", ownerID, key, err)
			return translateDBErrors(err)
		}

		// Also set the cached value
		cachedAttrs[key] = value
	}

	// Succeeded: cache the values
	as.cache.Set(*ownerID, cachedAttrs, ttlcache.DefaultTTL)
	return nil
}
