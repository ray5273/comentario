package svc

import (
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"sync"
	"time"
)

// TheDynConfigService is a global DynConfigService implementation
var TheDynConfigService DynConfigService = &dynConfigService{}

// DynConfigService is a service interface for dealing with dynamic instance configuration
type DynConfigService interface {
	// Get returns a configuration item by its key
	Get(key data.DynInstanceConfigItemKey) (*data.DynInstanceConfigItem, error)
	// GetAll returns all available configuration items
	GetAll() (map[data.DynInstanceConfigItemKey]*data.DynInstanceConfigItem, error)
	// GetBool returns the bool value of a configuration item by its key, or the default value on error
	GetBool(key data.DynInstanceConfigItemKey, defValue bool) bool
	// Load configuration data from the database
	Load() error
	// Reset resets all configuration data to its defaults
	Reset()
	// Save changed configuration data to the database
	Save() error
	// Set updates the value of a configuration item by its key. curUserID can be nil
	Set(curUserID *uuid.UUID, key data.DynInstanceConfigItemKey, value string) error
}

//----------------------------------------------------------------------------------------------------------------------

// dynConfigService is a blueprint DynConfigService implementation
type dynConfigService struct {
	mu    sync.RWMutex
	items map[data.DynInstanceConfigItemKey]*data.DynInstanceConfigItem
}

func (svc *dynConfigService) Get(key data.DynInstanceConfigItemKey) (*data.DynInstanceConfigItem, error) {
	svc.mu.RLock()
	defer svc.mu.RUnlock()
	return svc.get(key)
}

func (svc *dynConfigService) GetAll() (map[data.DynInstanceConfigItemKey]*data.DynInstanceConfigItem, error) {
	logger.Debug("dynConfigService.GetAll()")

	// Prevent concurrent write access
	svc.mu.RLock()
	defer svc.mu.RUnlock()

	// Make sure the config is initialised
	if svc.items == nil {
		return nil, errors.New("config is not initialised")
	}

	// Make an (immutable) copy of the items
	items := make(map[data.DynInstanceConfigItemKey]*data.DynInstanceConfigItem, len(svc.items))
	for k, v := range svc.items {
		vCopy := *v
		items[k] = &vCopy
	}
	return items, nil
}

func (svc *dynConfigService) GetBool(key data.DynInstanceConfigItemKey, defValue bool) bool {
	if i, err := svc.Get(key); err == nil {
		return i.AsBool()
	}
	return defValue
}

func (svc *dynConfigService) Load() error {
	logger.Debug("dynConfigService.Load()")

	// Prevent concurrent access
	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Init the config to its defaults
	svc.reset()

	// Query the data
	q := db.Dialect().
		From(goqu.T("cm_configuration")).
		Select("key", "value", "ts_updated", "user_updated")

	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("dynConfigService.Load: Select() failed: %v", err)
		return err
	}
	defer rows.Close()

	// Fetch the items
	for rows.Next() {
		var key data.DynInstanceConfigItemKey
		var value string
		var updatedTime time.Time
		var userUpdated uuid.NullUUID
		if err := rows.Scan(&key, &value, &updatedTime, &userUpdated); err != nil {
			logger.Errorf("dynConfigService.Load: rows.Scan() failed: %v", err)
			return err
		}

		// If the item is a valid one
		if ci, ok := svc.items[key]; ok && value != ci.DefaultValue {
			ci.Value = value
			ci.UpdatedTime = updatedTime
			ci.UserUpdated = userUpdated
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *dynConfigService) Reset() {
	logger.Debug("dynConfigService.Reset()")

	// Prevent concurrent access
	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Perform the reset
	svc.reset()
}

func (svc *dynConfigService) Save() error {
	logger.Debug("dynConfigService.Save()")

	// Prevent concurrent access
	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Don't bother if isn't initialised
	if svc.items == nil {
		return nil
	}

	// Iterate non-default items
	var keys []data.DynInstanceConfigItemKey
	for key, ci := range svc.items {
		if !ci.HasDefaultValue() {
			q := db.Dialect().
				Insert("cm_configuration").
				Rows(goqu.Record{
					"key":          key,
					"value":        ci.Value,
					"ts_updated":   ci.UpdatedTime,
					"user_updated": ci.UserUpdated,
				}).
				OnConflict(goqu.DoUpdate(
					"key",
					goqu.Record{"value": ci.Value, "ts_updated": ci.UpdatedTime, "user_updated": ci.UserUpdated}))
			if err := db.ExecuteOne(q.Prepared(true)); err != nil {
				return translateDBErrors(err)
			}

			// Collect the saved keys
			keys = append(keys, key)
		}
	}

	// Clean up all irrelevant items
	q := db.Dialect().Delete("cm_configuration")
	if len(keys) > 0 {
		q = q.Where(goqu.C("key").NotIn(keys))
	}
	if err := db.Execute(q); err != nil {
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *dynConfigService) Set(curUserID *uuid.UUID, key data.DynInstanceConfigItemKey, value string) error {
	logger.Debugf("dynConfigService.Set(%s, %q, %q)", curUserID, key, value)

	// Prevent concurrent access
	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Find the item
	ci, err := svc.get(key)
	if err != nil {
		return err
	}

	// Update the item
	ci.Value = value
	ci.UpdatedTime = time.Now().UTC()
	if curUserID == nil {
		ci.UserUpdated = uuid.NullUUID{}
	} else {
		ci.UserUpdated = uuid.NullUUID{UUID: *curUserID, Valid: true}
	}

	// Succeeded
	return nil
}

// get returns a configuration item by its key, without locking
func (svc *dynConfigService) get(key data.DynInstanceConfigItemKey) (*data.DynInstanceConfigItem, error) {
	// Make sure the config is initialised
	if svc.items == nil {
		return nil, errors.New("config is not initialised")
	}

	// Lookup the key
	if ci, ok := svc.items[key]; !ok {
		return nil, fmt.Errorf("config key %q is unknown", key)

	} else {
		// Succeeded
		return ci, nil
	}
}

// reset the configuration to its defaults
func (svc *dynConfigService) reset() {
	// Clone the default config, resetting all values to their defaults
	svc.items = make(map[data.DynInstanceConfigItemKey]*data.DynInstanceConfigItem, len(data.DefaultDynInstanceConfig))
	for key, item := range data.DefaultDynInstanceConfig {
		svc.items[key] = &data.DynInstanceConfigItem{
			Value:        item.DefaultValue,
			Description:  item.Description,
			Datatype:     item.Datatype,
			DefaultValue: item.DefaultValue,
		}
	}
}
