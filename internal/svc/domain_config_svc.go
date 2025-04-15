package svc

import (
	"context"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jellydator/ttlcache/v3"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
)

// DomainConfigService is a service interface for dealing with dynamic domain configuration
type DomainConfigService interface {
	// Get returns a configuration item by its key
	Get(domainID *uuid.UUID, key data.DynConfigItemKey) (*data.DynConfigItem, error)
	// GetAll returns all available configuration items
	GetAll(domainID *uuid.UUID) (data.DynConfigMap, error)
	// GetBool returns the bool value of a configuration item by its key, or the default value on error
	GetBool(domainID *uuid.UUID, key data.DynConfigItemKey) bool
	// GetInt returns the int value of a configuration item by its key, or the default value on error
	GetInt(domainID *uuid.UUID, key data.DynConfigItemKey) int
	// ResetCache empties the config cache
	ResetCache()
	// Update the values of the configuration items with the given keys and persist the changes. curUserID can be nil
	Update(domainID, curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error
	// ValidateKeyValue validates the given config item's key and value
	ValidateKeyValue(key, value string) error
}

//----------------------------------------------------------------------------------------------------------------------

// domainConfigStore is an extension to ConfigStore that stores per-domain dynamic config
type domainConfigStore struct {
	ConfigStore
	domainID uuid.UUID
}

func (cs *domainConfigStore) load(dbx persistence.DBX) error {
	return cs.dbLoad(dbx, "cm_domain_configuration", goqu.Ex{"domain_id": &cs.domainID})
}

func (cs *domainConfigStore) save(dbx persistence.DBX) error {
	return cs.dbSave(dbx, "cm_domain_configuration", goqu.Ex{"domain_id": &cs.domainID})
}

// getDomainDefaults returns default domain config items
func getDomainDefaults() (data.DynConfigMap, error) {
	// Fetch the instance defaults
	items, err := Services.DynConfigService().GetAll()
	if err != nil {
		return nil, fmt.Errorf("getDomainDefaults/DynConfigService.GetAll: %w", err)
	}

	// Pick those whose key starts with the domain.defaults prefix
	prefixLen := len(data.ConfigKeyDomainDefaultsPrefix)
	m := data.DynConfigMap{}
	for key, item := range items {
		if strings.HasPrefix(string(key), data.ConfigKeyDomainDefaultsPrefix) {
			// Strip the prefix from the key name
			m[key[prefixLen:]] = &data.DynConfigItem{
				Value:        item.Value,
				Datatype:     item.Datatype,
				DefaultValue: item.Value,
				Section:      item.Section,
				Min:          item.Min,
				Max:          item.Max,
			}
		}
	}
	return m, nil
}

//----------------------------------------------------------------------------------------------------------------------

// domainConfigCache is a cache-backed collection of domainConfigStore's
type domainConfigCache struct {
	c *ttlcache.Cache[uuid.UUID, *domainConfigStore] // Cached stores per domain ID
}

// newDomainConfigCache creates a new domainConfigCache
func newDomainConfigCache() *domainConfigCache {
	svc := &domainConfigCache{
		c: ttlcache.New[uuid.UUID, *domainConfigStore](
			ttlcache.WithTTL[uuid.UUID, *domainConfigStore](util.ConfigCacheTTL),
		),
	}

	// Debug logging
	if logger.IsEnabledFor(logging.DEBUG) {
		svc.c.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, i *ttlcache.Item[uuid.UUID, *domainConfigStore]) {
			logger.Debugf("domainConfigCache: evicted %s, reason=%d", i.Key(), reason)
		})
	}

	// Start the cache cleaner
	go svc.c.Start()
	return svc
}

func (svc *domainConfigCache) get(dbx persistence.DBX, domainID *uuid.UUID, key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	if s, err := svc.getStore(dbx, domainID); err != nil {
		return nil, err
	} else {
		return s.Get(key)
	}
}

func (svc *domainConfigCache) getAll(dbx persistence.DBX, domainID *uuid.UUID) (data.DynConfigMap, error) {
	logger.Debugf("domainConfigCache.getAll(%v, %s)", dbx, domainID)
	if s, err := svc.getStore(dbx, domainID); err != nil {
		return nil, err
	} else {
		return s.GetAll()
	}
}

// getStore returns the store for the given domain
func (svc *domainConfigCache) getStore(dbx persistence.DBX, domainID *uuid.UUID) (*domainConfigStore, error) {
	// Try to find a cached item
	if ci := svc.c.Get(*domainID); ci != nil {
		return ci.Value(), nil
	}

	// Cache miss: create a new store
	// NB: we cannot use ttlcache.WithLoader()/ttlcache.LoaderFunc because they don't support returning an error
	logger.Debugf("domainConfigCache.getStore: cache miss for %s", domainID)
	s := &domainConfigStore{
		ConfigStore: ConfigStore{defaults: getDomainDefaults},
		domainID:    *domainID,
	}

	// Load the config from the database
	if err := s.load(dbx); err != nil {
		return nil, err
	}

	// Cache the store
	svc.c.Set(*domainID, s, ttlcache.DefaultTTL)
	return s, nil
}

// resetCache empties the cached configs
func (svc *domainConfigCache) resetCache() {
	svc.c.DeleteAll()
}

// resetCacheFor empties the cached config for specific domain ID
func (svc *domainConfigCache) resetCacheFor(id *uuid.UUID) {
	svc.c.Delete(*id)
}

func (svc *domainConfigCache) update(dbx persistence.DBX, domainID, curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error {
	logger.Debugf("domainConfigCache.update(%v, %s, %s, %#v)", dbx, domainID, curUserID, vals)

	// Fetch the required store
	s, err := svc.getStore(dbx, domainID)
	if err != nil {
		return err
	}

	// Update the specified items
	if err := s.Update(curUserID, vals); err != nil {
		return err
	}

	// Write the store to the database
	return s.save(dbx)
}

//----------------------------------------------------------------------------------------------------------------------

// domainConfigService is a blueprint, transaction-aware domain config service implementation, making use of a cached
// config store
type domainConfigService struct {
	dbTxAware
	cc   *domainConfigCache // Underlying cached store
	dIDs map[uuid.UUID]bool // Set of domain IDs, whose values were changed during the transaction
}

// newDomainConfigService returns a new transactional attribute store implementation based on the given underlying attrStore
func newDomainConfigService(cc *domainConfigCache, tx *persistence.DatabaseTx, db *persistence.Database) *domainConfigService {
	svc := &domainConfigService{
		dbTxAware: dbTxAware{tx: tx, db: db},
		cc:        cc,
		dIDs:      map[uuid.UUID]bool{},
	}

	// Add the service as a child to the transaction, if any
	if tx != nil {
		tx.AddChild(svc)
	}
	return svc
}

func (svc *domainConfigService) Commit() error {
	// Nothing to do
	return nil
}

func (svc *domainConfigService) Get(domainID *uuid.UUID, key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	return svc.cc.get(svc.dbx(), domainID, key)
}

func (svc *domainConfigService) GetAll(domainID *uuid.UUID) (data.DynConfigMap, error) {
	return svc.cc.getAll(svc.dbx(), domainID)
}

func (svc *domainConfigService) GetBool(domainID *uuid.UUID, key data.DynConfigItemKey) bool {
	// First try to fetch the actual value
	if i, err := svc.Get(domainID, key); err == nil {
		return i.AsBool()
	}

	// Fall back to the instance default on error
	return Services.DynConfigService().GetBool(data.ConfigKeyDomainDefaultsPrefix + key)
}

func (svc *domainConfigService) GetInt(domainID *uuid.UUID, key data.DynConfigItemKey) int {
	// First try to fetch the actual value
	if i, err := svc.Get(domainID, key); err == nil {
		return i.AsInt()
	}

	// Fall back to the instance default on error
	return Services.DynConfigService().GetInt(data.ConfigKeyDomainDefaultsPrefix + key)
}

func (svc *domainConfigService) ResetCache() {
	svc.cc.resetCache()
}

func (svc *domainConfigService) Rollback() error {
	// Reset caches of the changed domains so they'll be restored in their original form with the next retrieval
	for id := range svc.dIDs {
		svc.cc.resetCacheFor(&id)
	}
	return nil
}

func (svc *domainConfigService) Update(domainID, curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error {
	return svc.cc.update(svc.dbx(), domainID, curUserID, vals)
}

func (svc *domainConfigService) ValidateKeyValue(key, value string) error {
	// Try to find the item among the instance defaults, by looking up the key for domain defaults
	if item, ok := data.DefaultDynInstanceConfig[data.DynConfigItemKey(data.ConfigKeyDomainDefaultsPrefix+key)]; !ok {
		return fmt.Errorf("invalid domain config item key: %q", key)
	} else {
		// Item found, now validate the value
		return item.ValidateValue(value)
	}
}
