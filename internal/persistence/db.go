package persistence

import (
	"bufio"
	"bytes"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"os"
	"os/signal"
	"path"
	"regexp"
	"sort"
	"strings"
	"sync/atomic"
	"time"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("persistence")

// Database is an opaque structure providing database operations
type Database struct {
	debug    bool      // Whether debug logging is enabled
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
	db := &Database{debug: config.CLIFlags.DBDebug, doneConn: make(chan bool, 1)}

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

// Dialect returns the goqu dialect to use for this database
func (db *Database) Dialect() goqu.DialectWrapper {
	return goqu.Dialect("postgres")
}

// Exec executes the provided statement against the database
func (db *Database) Exec(query string, args ...any) error {
	_, err := db.ExecRes(query, args...)
	return err
}

// ExecOne executes the provided statement against the database and verifies there's exactly one row affected
func (db *Database) ExecOne(query string, args ...any) error {
	if db.debug {
		logger.Debugf("db.ExecOne()\n - SQL: %s\n - Args: %#v", query, args)
	}
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

// Execute executes the provided goqu executor against the database
func (db *Database) Execute(e exp.SQLExpression) error {
	if eSQL, eParams, err := e.ToSQL(); err != nil {
		return err
	} else {
		return db.Exec(eSQL, eParams...)
	}
}

// ExecuteOne executes the provided goqu executor against the database and verifies there's exactly one row affected
func (db *Database) ExecuteOne(e exp.SQLExpression) error {
	if eSQL, eParams, err := e.ToSQL(); err != nil {
		return err
	} else {
		return db.ExecOne(eSQL, eParams...)
	}
}

// ExecRes executes the provided statement against the database and returns its result
func (db *Database) ExecRes(query string, args ...any) (sql.Result, error) {
	if db.debug {
		logger.Debugf("db.ExecRes()\n - SQL: %s\n - Args: %#v", query, args)
	}
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
		// Check if the migration is already installed, and if yes, collect its MD5 checksum
		var csExpected *[16]byte
		if cs, ok := installed[filename]; ok {
			csExpected = &cs
		}

		// Install the migration
		csActual, status, err := db.installMigration(filename, csExpected)
		var errMsg string
		if err != nil {
			errMsg = err.Error()
		}

		// If something was actually done
		if status != "" {
			// Add a log record, logging any error to the console
			if dbErr := db.Exec(
				"insert into cm_migration_log(filename, md5_expected, md5_actual, status, error_text) values($1, $2, $3, $4, $5);",
				filename, util.MD5ToHex(csExpected), util.MD5ToHex(&csActual), status, errMsg,
			); dbErr != nil {
				logger.Errorf("Failed to add migration log record for '%s' (status '%s'): %v", filename, status, dbErr)
			}
		}

		// Terminate the processing if the migration failed to install
		if err != nil {
			return err
		}

		// Migration processed successfully: register it in the database, updating the checksum if necessary
		if err := db.Exec(
			"insert into cm_migrations(filename, md5) values ($1, $2) "+
				"on conflict (filename) do update set md5=$2, ts_installed=current_timestamp;",
			filename, util.MD5ToHex(&csActual),
		); err != nil {
			return fmt.Errorf("failed to register migration '%s' in the database: %v", filename, err)
		}

		// Succeeded. Increment the successful migration counter if anything was changed
		if status != "" {
			cntOK++
		}
	}

	if cntOK > 0 {
		logger.Infof("Successfully installed %d migrations", cntOK)
	} else {
		logger.Infof("No new migrations found")
	}
	return nil
}

// Query executes the provided query against the database
func (db *Database) Query(query string, args ...any) (*sql.Rows, error) {
	if db.debug {
		logger.Debugf("db.Query()\n - SQL: %s\n - Args: %#v", query, args)
	}
	return db.db.Query(query, args...)
}

// QueryRow queries a single row from the database
func (db *Database) QueryRow(query string, args ...any) *sql.Row {
	if db.debug {
		logger.Debugf("db.QueryRow()\n - SQL: %s\n - Args: %#v", query, args)
	}
	return db.db.QueryRow(query, args...)
}

// Select executes the provided goqu query against the database
func (db *Database) Select(q *goqu.SelectDataset) (*sql.Rows, error) {
	if qSQL, qParams, err := q.Prepared(true).ToSQL(); err != nil {
		return nil, err
	} else {
		return db.Query(qSQL, qParams...)
	}
}

// SelectRow executes the provided goqu query against the database, returning a single row
func (db *Database) SelectRow(q *goqu.SelectDataset) util.Scanner {
	if qSQL, qParams, err := q.Prepared(true).ToSQL(); err != nil {
		return util.NewErrScanner(err)
	} else {
		return db.QueryRow(qSQL, qParams...)
	}
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
	row := db.QueryRow("select exists(select from pg_tables where schemaname='public' and tablename='cm_migrations')")
	var exists bool
	if err := row.Scan(&exists); err != nil {
		return nil, err
	} else if !exists {
		return nil, nil
	}

	// Query the migrations table
	rows, err := db.Query("select filename, md5 from cm_migrations;")
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

// installMigration installs a database migration contained in the given file, returning its actual MD5 checksum and the
// status
func (db *Database) installMigration(filename string, csExpected *[16]byte) (csActual [16]byte, status string, err error) {
	status = "failed"

	// Read in the content of the file
	fullName := path.Join(config.CLIFlags.DBMigrationPath, filename)
	contents, err := os.ReadFile(fullName)
	if err != nil {
		logger.Errorf("Failed to read file '%s': %v", fullName, err)
		return
	}

	// Parse migration metadata
	metadata, err := db.parseMetadata(contents)
	if err != nil {
		return
	}

	// Calculate the checksum
	csActual = md5.Sum(contents)

	// Verify the migration checksum if it's already installed
	pendingStatus := "installed"
	if csExpected != nil {
		// If the migration is installed and the checksum is intact, proceed to the next migration
		if *csExpected == csActual {
			logger.Debugf("Migration '%s' is already installed", filename)
			status = "" // Empty string means no change was made
			return
		}

		// The checksum is different
		errMsg := fmt.Sprintf("checksum mismatch for migration '%s': expected %x, actual %x", fullName, *csExpected, csActual)

		// Check the metadata setting
		switch metadata["onChecksumMismatch"] {
		// Fail is the default
		case "", "fail":
			err = errors.New(errMsg)
			return

		// If it can be ignored: log it and skip the migration
		case "skip":
			logger.Warning(errMsg + ". Skipping the migration")
			status = "skipped"
			return

		// If we need to rerun: log it and proceed with the installation
		case "reinstall":
			pendingStatus = "reinstalled"
			logger.Warning(errMsg + ". Reinstalling the migration")

		// Any other value is illegal
		default:
			logger.Warning(errMsg)
			status = "" // Empty string means no change was made
			err = fmt.Errorf(
				"invalid value for 'onChecksumMismatch' entry in migration '%s' metadata (valid values are 'fail', 'skip', 'reinstall')",
				fullName)
			return
		}
	}

	// Run the content of the file
	logger.Debugf("Installing migration '%s'", filename)
	if err = db.Exec(string(contents)); err != nil {
		// #EXIT# is a special marker in the exception, which means script graciously exited
		if strings.Contains(err.Error(), "#EXIT#") {
			logger.Debugf("Migration script has successfully exited with: %v", err)
			err = nil
		} else {
			// Any other error
			err = fmt.Errorf("failed to execute migration '%s': %v", fullName, err)
			return
		}
	}

	// Succeeded
	status = pendingStatus
	return
}

// parseMetadata parses the given content of a migration .sql file and returns its metadata key-value map
func (db *Database) parseMetadata(b []byte) (map[string]string, error) {
	reMeta := regexp.MustCompile(`^--\s*@meta\b(.*)$`)
	reKVal := regexp.MustCompile(`^(\w+)\s*=\s*(.+)$`)
	m := map[string]string{}
	scanner := bufio.NewScanner(bytes.NewReader(b))
	i := 0
	for scanner.Scan() {
		i++

		// Stop at the first non-comment line
		if line := scanner.Text(); len(line) < 2 || line[0] != '-' || line[1] != '-' {
			break

			// Check for a metadata marker
		} else if sm := reMeta.FindStringSubmatch(line); len(sm) == 0 {
			// No valid metadata entry
			continue

			// Check for a metadata key-value content
		} else if kv := strings.TrimSpace(sm[1]); kv == "" {
			return nil, fmt.Errorf("empty @meta key-value at line %d", i)

			// Parse the key-value
		} else if smkv := reKVal.FindStringSubmatch(kv); len(smkv) == 0 {
			return nil, fmt.Errorf("invalid @meta key-value at line %d: '%s'", i, kv)

		} else {
			// Metadata key=value entry found
			m[smkv[1]] = smkv[2]
		}
	}

	// Check for possible errors
	if err := scanner.Err(); err != nil {
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
