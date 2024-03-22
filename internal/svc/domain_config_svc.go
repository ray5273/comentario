package svc

import (
	"context"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jellydator/ttlcache/v3"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
)

// TheDomainConfigService is a global DomainConfigService implementation
var TheDomainConfigService DomainConfigService = newDomainConfigService()

// DomainConfigService is a service interface for dealing with dynamic domain configuration
type DomainConfigService interface {
	// Get returns a configuration item by its key
	Get(domainID *uuid.UUID, key data.DynConfigItemKey) (*data.DynConfigItem, error)
	// GetAll returns all available configuration items
	GetAll(domainID *uuid.UUID) (map[data.DynConfigItemKey]*data.DynConfigItem, error)
	// GetBool returns the bool value of a configuration item by its key, or the default value on error
	GetBool(domainID *uuid.UUID, key data.DynConfigItemKey) bool
	// ResetCache empties the config cache
	ResetCache()
	// Update the values of the configuration items with the given keys and persist the changes. curUserID can be nil
	Update(domainID, curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error
}

//----------------------------------------------------------------------------------------------------------------------

// domainConfigStore is an extension to ConfigStore that stores per-domain dynamic config
type domainConfigStore struct {
	ConfigStore
	domainID uuid.UUID
}

func (cs *domainConfigStore) Load() error {
	return cs.dbLoad("cm_domain_configuration", goqu.Ex{"domain_id": &cs.domainID})
}

func (cs *domainConfigStore) Save() error {
	return cs.dbSave("cm_domain_configuration", goqu.Ex{"domain_id": &cs.domainID})
}

//----------------------------------------------------------------------------------------------------------------------

// getDomainDefaults returns default domain config items
func getDomainDefaults() (map[data.DynConfigItemKey]*data.DynConfigItem, error) {
	// Fetch the instance defaults
	items, err := TheDynConfigService.GetAll()
	if err != nil {
		return nil, fmt.Errorf("getDomainDefaults: TheDynConfigService.GetAll() failed: %w", err)
	}

	// Pick those whose key starts with the domain.defaults prefix
	prefixLen := len(data.ConfigKeyDomainDefaultsPrefix)
	m := make(map[data.DynConfigItemKey]*data.DynConfigItem)
	for key, item := range items {
		if strings.HasPrefix(string(key), data.ConfigKeyDomainDefaultsPrefix) {
			// Strip the prefix from the key name
			m[key[prefixLen:]] = &data.DynConfigItem{
				Value:        item.Value,
				Datatype:     item.Datatype,
				DefaultValue: item.Value,
			}
		}
	}
	return m, nil
}

// newDomainConfigService creates a new DomainConfigService
func newDomainConfigService() *domainConfigService {
	svc := &domainConfigService{
		cache: ttlcache.New[uuid.UUID, *domainConfigStore](
			ttlcache.WithTTL[uuid.UUID, *domainConfigStore](util.ConfigCacheTTL),
		),
	}

	// Debug logging
	if logger.IsEnabledFor(logging.DEBUG) {
		svc.cache.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, i *ttlcache.Item[uuid.UUID, *domainConfigStore]) {
			logger.Debugf("domainConfigService: evicted %s, reason=%d", i.Key(), reason)
		})
	}

	// Start the cache cleaner
	go svc.cache.Start()
	return svc
}

// domainConfigService is a blueprint DomainConfigService implementation
type domainConfigService struct {
	cache *ttlcache.Cache[uuid.UUID, *domainConfigStore] // Cached stores per domain ID
}

func (svc *domainConfigService) Get(domainID *uuid.UUID, key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	if s, err := svc.getStore(domainID); err != nil {
		return nil, err
	} else {
		return s.Get(key)
	}
}

func (svc *domainConfigService) GetAll(domainID *uuid.UUID) (map[data.DynConfigItemKey]*data.DynConfigItem, error) {
	logger.Debugf("domainConfigService.GetAll(%s)", domainID)
	if s, err := svc.getStore(domainID); err != nil {
		return nil, err
	} else {
		return s.GetAll()
	}
}

func (svc *domainConfigService) GetBool(domainID *uuid.UUID, key data.DynConfigItemKey) bool {
	// First try to fetch the actual value
	if i, err := svc.Get(domainID, key); err == nil {
		return i.AsBool()
	}

	// Fall back to the instance default on error
	return TheDynConfigService.GetBool(data.ConfigKeyDomainDefaultsPrefix + key)
}

func (svc *domainConfigService) ResetCache() {
	svc.cache.DeleteAll()
}

func (svc *domainConfigService) Update(domainID, curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error {
	logger.Debugf("domainConfigService.Update(%s, %s, %#v)", domainID, curUserID, vals)

	// Fetch the required store
	s, err := svc.getStore(domainID)
	if err != nil {
		return err
	}

	// Update the specified items
	for k, v := range vals {
		if err := s.Set(curUserID, k, v); err != nil {
			return err
		}
	}

	// Write the store to the database
	return s.Save()
}

// getStore returns the store for the given domain
func (svc *domainConfigService) getStore(domainID *uuid.UUID) (*domainConfigStore, error) {
	// Try to find a cached item
	if ci := svc.cache.Get(*domainID); ci != nil {
		return ci.Value(), nil
	}

	// Cache miss: create a new store
	// NB: we cannot use ttlcache.WithLoader()/ttlcache.LoaderFunc because they don't support returning an error
	logger.Debugf("domainConfigService.getStore: cache miss for %s", domainID)
	s := &domainConfigStore{
		ConfigStore: ConfigStore{defaults: getDomainDefaults},
		domainID:    *domainID,
	}

	// Load the config from the database
	if err := s.Load(); err != nil {
		logger.Errorf("domainConfigService.getStore: s.Load() failed: %v", err)
		return nil, err
	}

	// Cache the store
	svc.cache.Set(*domainID, s, ttlcache.DefaultTTL)
	return s, nil
}
