package persistence

import (
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"os"
	"os/signal"
	"path"
	"sort"
	"strings"
	"sync/atomic"
	"time"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("persistence")

// Database is an opaque structure providing database operations
type Database struct {
	db       *sql.DB   // Internal SQL database instance
	doneConn chan bool // Receives a true when the connection process has been finished (successfully or not)
}

// InitDB establishes a database connection
func InitDB() (*Database, error) {
	// Verify configuration
	if err := validateConfig(); err != nil {
		return nil, err
	}

	// Create a new database instance
	db := &Database{doneConn: make(chan bool, 1)}

	// Try to connect
	if err := db.connect(); err != nil {
		return nil, err
	}

	// Run migrations
	if err := db.Migrate(); err != nil {
		return nil, err
	}

	// Succeeded
	return db, nil
}

// Exec executes the provided statement against the database
func (db *Database) Exec(query string, args ...any) error {
	_, err := db.ExecRes(query, args...)
	return err
}

// ExecOne executes the provided statement against the database and verifies there's exactly one row affected
func (db *Database) ExecOne(query string, args ...any) error {
	if res, err := db.db.Exec(query, args...); err != nil {
		return err
	} else if cnt, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("RowsAffected() failed: %v", err)
	} else if cnt == 0 {
		return sql.ErrNoRows
	} else if cnt != 1 {
		return fmt.Errorf("statement affected %d rows, want 1", cnt)
	}
	return nil
}

// ExecRes executes the provided statement against the database and returns its result
func (db *Database) ExecRes(query string, args ...any) (sql.Result, error) {
	return db.db.Exec(query, args...)
}

// Migrate installs necessary migrations
func (db *Database) Migrate() error {
	// Read available migrations
	available, err := db.getAvailableMigrations()

	// Query already installed migrations
	installed, err := db.getInstalledMigrations()
	if err != nil {
		return err
	}
	logger.Infof("%d migrations already installed", len(installed))

	cntOK := 0
	for _, filename := range available {
		// Read in the content of the file
		fullName := path.Join(config.CLIFlags.DBMigrationPath, filename)
		contents, err := os.ReadFile(fullName)
		if err != nil {
			logger.Errorf("Failed to read file '%s': %v", fullName, err)
			return err
		}

		// Calculate the checksum
		csActual := md5.Sum(contents)

		// Verify the migration checksum if it's already installed
		if csExpected, ok := installed[filename]; ok {
			if csExpected != csActual {
				return fmt.Errorf("checksum mismatch for migration '%s': expected %x, actual %x", fullName, csExpected, csActual)
			}
			logger.Debugf("Migration '%s' is already installed", filename)
			continue
		}

		// Run the content of the file
		logger.Debugf("Installing migration '%s'", filename)
		if _, err := db.db.Exec(string(contents)); err != nil {
			return fmt.Errorf("failed to execute migration '%s': %v", fullName, err)
		}

		// Register the migration in the database
		/* TODO new-db: enable after 0000-comentario-legacy.sql is ditched
		if _, err := db.db.Exec("insert into cm_migrations(filename, md5) values ($1, $2);", filename, hex.EncodeToString(csActual[:])); err != nil {
			return fmt.Errorf("failed to register migration '%s' in the database: %v", filename, err)
		}
		*/

		// Succeeded
		cntOK++
	}

	if cntOK > 0 {
		logger.Infof("Successfully installed %d new migrations", cntOK)
	} else {
		logger.Infof("No new migrations found")
	}
	return nil
}

// Query executes the provided query against the database
func (db *Database) Query(query string, args ...any) (*sql.Rows, error) {
	return db.db.Query(query, args...)
}

// QueryRow queries a single row from the database
func (db *Database) QueryRow(query string, args ...any) *sql.Row {
	return db.db.QueryRow(query, args...)
}

// Shutdown ends the database connection and shuts down all dependent services
func (db *Database) Shutdown() error {
	// If there's a connection, try to disconnect
	if db != nil {
		logger.Info("Disconnecting from database...")
		if err := db.db.Close(); err != nil {
			logger.Errorf("Failed to disconnect from database: %v", err)
		}
	}

	// Succeeded
	logger.Info("Disconnected from database")
	return nil
}

// connect establishes a database connection up to the configured number of attempts
func (db *Database) connect() error {
	logger.Infof(
		"Connecting to database '%s' at %s@%s:%d...",
		config.SecretsConfig.Postgres.Database,
		config.SecretsConfig.Postgres.Username,
		config.SecretsConfig.Postgres.Host,
		config.SecretsConfig.Postgres.Port)

	var interrupted atomic.Bool // Whether the connection process has been interrupted (because of a requested shutdown)

	// Set up an interrupt handler
	cIntLoop := make(chan os.Signal, 1)
	cIntSleep := make(chan bool, 1)
	signal.Notify(cIntLoop, os.Interrupt)
	go func() {
		select {
		// Done connecting, stop monitoring the SIGINT
		case <-db.doneConn:
			signal.Stop(cIntLoop)
			return

		// SIGINT received, interrupt the connect loop and signal to interrupt a possible sleep
		case <-cIntLoop:
			logger.Warning("Interrupting database connection process...")
			interrupted.Store(true)
			cIntSleep <- true
		}
	}()

	// Signal the monitoring process whenever this function is done
	defer func() { db.doneConn <- true }()

	var err error
	var retryDelay = time.Second // Start with a delay of one second
	for attempt := 1; attempt <= util.DBMaxAttempts; attempt++ {
		// Exit when terminated
		if interrupted.Load() {
			return errors.New("interrupted")
		}

		// Try to establish a connection
		if err = db.tryConnect(attempt, util.DBMaxAttempts); err == nil {
			break // Succeeded
		}

		// Failed to connect
		select {
		// Wait a progressively doubling period of time before the next attempt
		case <-time.After(retryDelay):
			break
		// Interrupt the sleep
		case <-cIntSleep:
			break
		}
		retryDelay *= 2
	}

	// Failed to connect
	if err != nil {
		logger.Errorf("Failed to connect to database after %d attempts, exiting", util.DBMaxAttempts)
		return err
	}

	// Configure the database
	db.db.SetMaxIdleConns(config.CLIFlags.DBIdleConns)
	logger.Info("Connected to database")
	return nil
}

// getAvailableMigrations returns a list of available database migration files
func (db *Database) getAvailableMigrations() ([]string, error) {
	// Scan the migrations dir for available migration files
	files, err := os.ReadDir(config.CLIFlags.DBMigrationPath)
	if err != nil {
		logger.Errorf("Failed to read DB migrations dir '%s': %v", config.CLIFlags.DBMigrationPath, err)
		return nil, err
	}

	// Convert the list of entries into a list of file names
	var list []string
	for _, file := range files {
		// Ignore directories and non-SQL files
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			list = append(list, file.Name())
		}
	}

	// The files must be sorted by name, in the ascending order
	sort.Strings(list)
	logger.Infof("Discovered %d database migrations in %s", len(list), config.CLIFlags.DBMigrationPath)
	return list, err
}

// getInstalledMigrations returns a map of installed database migrations (filename: md5)
func (db *Database) getInstalledMigrations() (map[string][16]byte, error) {
	// If no migrations table is present, it means no migration in installed either (the schema is most likely empty)
	row := db.db.QueryRow("select exists(select from pg_tables where schemaname='public' and tablename='cm_migrations')")
	var exists bool
	if err := row.Scan(&exists); err != nil {
		return nil, err
	} else if !exists {
		return nil, nil
	}

	// Query the migrations table
	rows, err := db.db.Query("select filename, md5 from cm_migrations;")
	if err != nil {
		return nil, fmt.Errorf("getInstalledMigrations: Query() failed: %v", err)
	}
	defer rows.Close()

	// Convert the files into a map
	m := make(map[string][16]byte)
	for rows.Next() {
		var filename, checksum string
		if err = rows.Scan(&filename, &checksum); err != nil {
			return nil, fmt.Errorf("getInstalledMigrations: Scan() failed: %v", err)
		}

		// Parse the sum as binary
		if b, err := hex.DecodeString(checksum); err != nil {
			return nil, fmt.Errorf("getInstalledMigrations: failed to decode MD5 checksum for migration '%s': %v", filename, err)
		} else if l := len(b); l != 16 {
			return nil, fmt.Errorf("getInstalledMigrations: wrong MD5 checksum length for migration '%s': got %d, want 16", filename, l)
		} else {
			var b16 [16]byte
			copy(b16[:], b)
			m[filename] = b16
		}
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("getInstalledMigrations: Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return m, nil
}

// tryConnect tries to establish a database connection, once
func (db *Database) tryConnect(num, total int) error {
	var err error
	db.db, err = sql.Open(
		"postgres",
		fmt.Sprintf(
			"postgres://%s:%s@%s:%d/%s?sslmode=%s",
			config.SecretsConfig.Postgres.Username,
			config.SecretsConfig.Postgres.Password,
			config.SecretsConfig.Postgres.Host,
			config.SecretsConfig.Postgres.Port,
			config.SecretsConfig.Postgres.Database,
			config.SecretsConfig.Postgres.SSLMode,
		))

	// Failed to connect
	if err != nil {
		logger.Warningf("[Attempt %d/%d] Failed to connect to database: %v", num, total, err)
		return err
	}

	// Connected successfully. Verify the connection by issuing a ping
	err = db.db.Ping()
	if err != nil {
		logger.Warningf("[Attempt %d/%d] Failed to ping database: %v", num, total, err)
	}
	return err
}

// validateConfig verifies the database configuration is valid
func validateConfig() error {
	var e []string
	if config.SecretsConfig.Postgres.Host == "" {
		e = append(e, "host is not specified")
	}
	if config.SecretsConfig.Postgres.Port == 0 {
		config.SecretsConfig.Postgres.Port = 5432 // PostgreSQL default
	}
	if config.SecretsConfig.Postgres.Database == "" {
		e = append(e, "DB name is not specified")
	}
	if config.SecretsConfig.Postgres.Username == "" {
		e = append(e, "username is not specified")
	}
	if config.SecretsConfig.Postgres.Password == "" {
		e = append(e, "password is not specified")
	}
	if config.SecretsConfig.Postgres.SSLMode == "" {
		config.SecretsConfig.Postgres.SSLMode = "disable"
	}
	if len(e) > 0 {
		return fmt.Errorf("database misconfigured: %s", strings.Join(e, "; "))
	}
	return nil
}
