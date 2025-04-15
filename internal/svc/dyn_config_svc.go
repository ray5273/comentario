package svc

import (
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"sync"
	"time"
)

// DynConfigService is a service interface for dealing with dynamic instance configuration
type DynConfigService interface {
	// Get returns a configuration item by its key
	Get(key data.DynConfigItemKey) (*data.DynConfigItem, error)
	// GetAll returns all available configuration items
	GetAll() (data.DynConfigMap, error)
	// GetBool returns the bool value of a configuration item by its key, or the default value on error
	GetBool(key data.DynConfigItemKey) bool
	// GetInt returns the int value of a configuration item by its key, or the default value on error
	GetInt(key data.DynConfigItemKey) int
	// Load configuration data from the database
	Load() error
	// Reset all configuration data to its defaults, then persist the data
	Reset() error
	// Update the values of the configuration items with the given keys and persist the changes. curUserID can be nil
	Update(curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error
}

//----------------------------------------------------------------------------------------------------------------------

// dynConfigRecord represents a dynamic config database record
type dynConfigRecord struct {
	Key         data.DynConfigItemKey `db:"key"`
	Value       string                `db:"value"`
	UpdatedTime time.Time             `db:"ts_updated"`
	UserUpdated uuid.NullUUID         `db:"user_updated"`
}

var errConfigUninitialised = errors.New("config is not initialised")

// ConfigStore is a transient, concurrent store for DynConfigItem's
type ConfigStore struct {
	mu       sync.RWMutex                      // Config item mutex
	items    data.DynConfigMap                 // Config items
	defaults func() (data.DynConfigMap, error) // Function returning a new, fresh map of items, all with their default values
}

func (cs *ConfigStore) Get(key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.get(key)
}

func (cs *ConfigStore) GetAll() (data.DynConfigMap, error) {
	// Prevent concurrent write access
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	// Make sure the config is initialised
	if cs.items == nil {
		return nil, errConfigUninitialised
	}

	// Return a (immutable) clone of the items
	return cs.items.Clone(), nil
}

// Reset all configuration data to instance defaults
func (cs *ConfigStore) Reset() error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	items, err := cs.defaults()
	if err == nil {
		cs.items = items
	}
	return err
}

// Update sets multiple item values at once
func (cs *ConfigStore) Update(curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error {
	// Prevent concurrent access
	cs.mu.Lock()
	defer cs.mu.Unlock()

	for k, v := range vals {
		// Find the item
		ci, err := cs.get(k)
		if err != nil {
			return err
		}

		// Validate the value
		if err := ci.ValidateValue(v); err != nil {
			return err
		}

		// Update the item
		ci.Value = v
		ci.UpdatedTime = time.Now().UTC()
		ci.UserUpdated = *data.PtrToNullUUID(curUserID)
	}

	// Succeeded
	return nil
}

// dbLoad loads the config from the given table, with an optional key filter
func (cs *ConfigStore) dbLoad(dbx persistence.DBX, tableName string, extraKeyCols goqu.Ex) error {
	// Prevent concurrent access
	cs.mu.Lock()
	defer cs.mu.Unlock()

	// Init the config with the defaults
	items, err := cs.defaults()
	if err != nil {
		return err
	}
	cs.items = items

	// Query the data
	var dbRecs []dynConfigRecord
	if err := dbx.From(goqu.T(tableName)).Where(extraKeyCols).ScanStructs(&dbRecs); err != nil {
		return translateDBErrors("ConfigStore.Load/ScanStructs", err)
	}

	// Process the fetched items
	for _, r := range dbRecs {
		// If the item is a valid one
		if ci, ok := cs.items[r.Key]; ok && r.Value != ci.DefaultValue {
			ci.Value = r.Value
			ci.UpdatedTime = r.UpdatedTime
			ci.UserUpdated = r.UserUpdated
		}
	}

	// Succeeded
	return nil
}

// dbSave writes the config into the given table, with an optional key filter
func (cs *ConfigStore) dbSave(dbx persistence.DBX, tableName string, extraKeyCols goqu.Ex) error {
	// Prevent concurrent access
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	// Make sure the config is initialised
	if cs.items == nil {
		return errConfigUninitialised
	}

	// Make a key column spec
	keyCols := "key"
	for k := range extraKeyCols {
		keyCols = k + "," + keyCols
	}

	// Iterate the items, building up a multirow insert statement
	var rows []any
	for key, ci := range cs.items {
		// Prepare a row
		row := goqu.Record{
			"key":          key,
			"value":        ci.Value,
			"ts_updated":   ci.UpdatedTime,
			"user_updated": ci.UserUpdated,
		}

		// Add the predefined key columns (if any)
		for k, v := range extraKeyCols {
			row[k] = v
		}

		// Accumulate the rows
		rows = append(rows, row)
	}

	// Remove and reinsert all items in scope
	if _, err := dbx.Delete(tableName).Where(extraKeyCols).Executor().Exec(); err != nil {
		return translateDBErrors("ConfigStore.dbSave/Exec[delete]", err)
	}
	if _, err := dbx.Insert(tableName).Rows(rows...).Executor().Exec(); err != nil {
		return translateDBErrors("ConfigStore.dbSave/Exec[insert]", err)
	}

	// Succeeded
	return nil
}

// get returns a configuration item by its key, without locking
func (cs *ConfigStore) get(key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	// Make sure the config is initialised
	if cs.items == nil {
		return nil, errConfigUninitialised
	}

	// Look the key up
	if ci, ok := cs.items[key]; ok {
		// Succeeded
		return ci, nil
	}
	return nil, fmt.Errorf("config key %q is unknown", key)
}

//----------------------------------------------------------------------------------------------------------------------

// instanceConfigStore is an extension to ConfigStore that stores global dynamic config
type instanceConfigStore struct {
	ConfigStore
	dbx persistence.DBX
}

func (cs *instanceConfigStore) Load() error {
	return cs.dbLoad(cs.dbx, "cm_configuration", goqu.Ex{})
}

func (cs *instanceConfigStore) Save() error {
	return cs.dbSave(cs.dbx, "cm_configuration", goqu.Ex{})
}

//----------------------------------------------------------------------------------------------------------------------

// getInstanceDefaults returns a clone of the default config, with all values set to the default
func getInstanceDefaults() (data.DynConfigMap, error) {
	m := make(data.DynConfigMap, len(data.DefaultDynInstanceConfig))
	for key, item := range data.DefaultDynInstanceConfig {
		m[key] = &data.DynConfigItem{
			Value:        item.DefaultValue,
			Datatype:     item.Datatype,
			DefaultValue: item.DefaultValue,
			Section:      item.Section,
			Min:          item.Min,
			Max:          item.Max,
		}
	}
	return m, nil
}

// newDynConfigService creates a new DynConfigService
func newDynConfigService(dbx persistence.DBX) *dynConfigService {
	return &dynConfigService{
		s: &instanceConfigStore{ConfigStore: ConfigStore{defaults: getInstanceDefaults}, dbx: dbx},
	}
}

// dynConfigService is a blueprint DynConfigService implementation
type dynConfigService struct {
	s *instanceConfigStore
}

func (svc *dynConfigService) Get(key data.DynConfigItemKey) (*data.DynConfigItem, error) {
	return svc.s.Get(key)
}

func (svc *dynConfigService) GetAll() (data.DynConfigMap, error) {
	logger.Debug("dynConfigService.GetAll()")
	return svc.s.GetAll()
}

func (svc *dynConfigService) GetBool(key data.DynConfigItemKey) bool {
	// First try to fetch the actual value
	if i, err := svc.Get(key); err == nil {
		return i.AsBool()
	}

	// Fall back to the item's default value on error
	if item, ok := data.DefaultDynInstanceConfig[key]; ok {
		return item.DefaultValue == "true"
	}

	// Invalid key passed
	return false
}

func (svc *dynConfigService) GetInt(key data.DynConfigItemKey) int {
	// First try to fetch the actual value
	if i, err := svc.Get(key); err == nil {
		return i.AsInt()
	}

	// Fall back to the item's default value on error
	if item, ok := data.DefaultDynInstanceConfig[key]; ok {
		return item.AsInt()
	}

	// Invalid key passed
	return -1
}

func (svc *dynConfigService) Load() error {
	logger.Debug("dynConfigService.Load()")
	return svc.s.Load()
}

func (svc *dynConfigService) Reset() error {
	logger.Debug("dynConfigService.Reset()")
	// Reset the config
	if err := svc.s.Reset(); err != nil {
		return err
	}

	// Save the updated values
	if err := svc.s.Save(); err != nil {
		return err
	}

	// Flush any cached domain config to enforce any new defaults
	Services.DomainConfigService(nil).ResetCache()

	// Succeeded
	return nil
}

func (svc *dynConfigService) Update(curUserID *uuid.UUID, vals map[data.DynConfigItemKey]string) error {
	logger.Debugf("dynConfigService.Update(%s, %#v)", curUserID, vals)

	// Update the specified items
	if err := svc.s.Update(curUserID, vals); err != nil {
		return err
	}

	// Save the config
	if err := svc.s.Save(); err != nil {
		return err
	}

	// Flush any cached domain config to enforce any new defaults
	Services.DomainConfigService(nil).ResetCache()

	// Succeeded
	return nil
}
