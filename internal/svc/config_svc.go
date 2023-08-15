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

// TheConfigService is a global ConfigService implementation
var TheConfigService ConfigService = &configService{}

// ConfigService is a service interface for dealing with instance configuration
type ConfigService interface {
	// Get returns a configuration entry by its key
	Get(key data.InstanceConfigItemKey) (*data.InstanceConfigItem, error)
	// Load configuration data from the database
	Load() error
	// Save changed configuration data to the database
	Save() error
	// Set updates the value of a configuration entry by its key
	Set(curUserID *uuid.UUID, key data.InstanceConfigItemKey, value string) error
}

//----------------------------------------------------------------------------------------------------------------------

// configService is a blueprint ConfigService implementation
type configService struct {
	mu    sync.RWMutex
	items map[data.InstanceConfigItemKey]*data.InstanceConfigItem
}

func (svc *configService) Get(key data.InstanceConfigItemKey) (*data.InstanceConfigItem, error) {
	logger.Debugf("configService.Get(%q)", key)

	// Prevent concurrent write access
	svc.mu.RLock()
	defer svc.mu.RUnlock()
	return svc.get(key)
}

func (svc *configService) Load() error {
	logger.Debug("configService.Load()")

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
		logger.Errorf("configService.Load: Select() failed: %v", err)
		return err
	}
	defer rows.Close()

	// Fetch the items
	for rows.Next() {
		var key data.InstanceConfigItemKey
		var value string
		var updatedTime time.Time
		var userUpdated uuid.NullUUID
		if err := rows.Scan(&key, &value, &updatedTime, &userUpdated); err != nil {
			logger.Errorf("configService.Load: rows.Scan() failed: %v", err)
			return err
		}

		// If the entry is a valid one
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

func (svc *configService) Save() error {
	logger.Debug("configService.Save()")

	// Prevent concurrent access
	svc.mu.Lock()
	defer svc.mu.Unlock()

	// Don't bother if isn't initialised
	if svc.items == nil {
		return nil
	}

	// Iterate non-default items
	var keys []data.InstanceConfigItemKey
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

func (svc *configService) Set(curUserID *uuid.UUID, key data.InstanceConfigItemKey, value string) error {
	logger.Debugf("configService.Set(%s, %q, %q)", curUserID, key, value)

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
	ci.UserUpdated = uuid.NullUUID{UUID: *curUserID, Valid: true}

	// Succeeded
	return nil
}

// get returns a configuration entry by its key, without locking
func (svc *configService) get(key data.InstanceConfigItemKey) (*data.InstanceConfigItem, error) {
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
func (svc *configService) reset() {
	svc.items = map[data.InstanceConfigItemKey]*data.InstanceConfigItem{
		data.ConfigKeyAuthSignupConfirmUser:      {DefaultValue: "true", Datatype: data.ConfigDatatypeBoolean, Description: "Whether new users must confirm their email address"},
		data.ConfigKeyAuthSignupConfirmCommenter: {DefaultValue: "true", Datatype: data.ConfigDatatypeBoolean, Description: "Whether new commenters must confirm their email address"},
	}
	// Reset all values to their defaults
	for _, ci := range svc.items {
		ci.Value = ci.DefaultValue
	}
}
