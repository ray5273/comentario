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
	_ "github.com/lib/pq"           // PostgreSQL driver
	_ "github.com/mattn/go-sqlite3" // SQLite3 driver
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/intf"
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

// dbDialect represents the database dialect in use. In terms of values it's compatible with sql's driverName and
// goqu's dialect string
type dbDialect string

// dialectWrapper returns the goqu dialect wrapper to use for this dialect
func (d dbDialect) dialectWrapper() goqu.DialectWrapper {
	return goqu.Dialect(string(d))
}

const (
	dbPostgres dbDialect = "postgres"
	dbSQLite3  dbDialect = "sqlite3"
)

var errUnknownDialect = errors.New("unknown DB dialect")

// Database is an opaque structure providing database operations
type Database struct {
	dialect  dbDialect // Database dialect in use
	debug    bool      // Whether debug logging is enabled
	db       *sql.DB   // Internal SQL database instance
	doneConn chan bool // Receives a true when the connection process has been finished (successfully or not)
	version  string    // Actual database server version
}

// InitDB establishes a database connection
func InitDB() (*Database, error) {
	// Determine the DB dialect to use and validate config
	var dialect dbDialect
	switch {
	// PostgreSQL
	case config.SecretsConfig.Postgres.Host != "":
		dialect = dbPostgres
	// SQLite3
	case config.SecretsConfig.SQLite3.File != "":
		dialect = dbSQLite3
	// Failed to identify DB dialect
	default:
		return nil, errors.New("failed to determine DB dialect")
	}

	// Create a new database instance
	logger.Infof("Using database dialect: %s", dialect)
	db := &Database{dialect: dialect, debug: config.ServerConfig.DBDebug, doneConn: make(chan bool, 1)}

	// Try to connect
	if err := db.connect(); err != nil {
		return nil, err
	}

	// Run migrations
	if err := db.Migrate(""); err != nil {
		return nil, err
	}

	// Succeeded
	return db, nil
}

// Dialect returns the goqu dialect to use for this database
func (db *Database) Dialect() goqu.DialectWrapper {
	return db.dialect.dialectWrapper()
}

// DB returns a goqu.Database to use for queries
func (db *Database) DB() *goqu.Database {
	return db.Dialect().DB(db.db)
}

// Execute executes the provided goqu expression against the database
func (db *Database) Execute(e exp.SQLExpression) error {
	_, err := db.ExecuteRes(e)
	return err
}

// ExecuteOne executes the provided goqu expression against the database and verifies there's exactly one row affected
func (db *Database) ExecuteOne(e exp.SQLExpression) error {
	// Convert the expression into SQL and params
	eSQL, eParams, err := setPrepared(e).ToSQL()
	if err != nil {
		return err
	}

	// Debug logging
	db.debugLogSQL("ExecuteOne", eSQL, eParams)

	// Run the statement
	if res, err := db.db.Exec(eSQL, eParams...); err != nil {
		return err
	} else if cnt, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("RowsAffected() failed: %v", err)
	} else if cnt == 0 {
		return sql.ErrNoRows
	} else if cnt != 1 {
		return fmt.Errorf("statement affected %d rows, want 1", cnt)
	}

	// Succeeded
	return nil
}

// ExecuteRes executes the provided goqu expression against the database and returns its result
func (db *Database) ExecuteRes(e exp.SQLExpression) (sql.Result, error) {
	// Convert the expression into SQL and params
	eSQL, eParams, err := setPrepared(e).ToSQL()
	if err != nil {
		return nil, err
	}

	// Debug logging
	db.debugLogSQL("ExecuteRes", eSQL, eParams)

	// Execute the statement
	return db.db.Exec(eSQL, eParams...)
}

// Migrate installs necessary migrations, and, optionally the passed seed SQL
func (db *Database) Migrate(seed string) error {
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
			if dbErr := db.ExecuteOne(
				db.Dialect().
					Insert("cm_migration_log").
					Rows(goqu.Record{
						"filename":     filename,
						"md5_expected": util.MD5ToHex(csExpected),
						"md5_actual":   util.MD5ToHex(&csActual),
						"status":       status,
						"error_text":   errMsg,
					}),
			); dbErr != nil {
				logger.Errorf("Failed to add migration log record for '%s' (status '%s'): %v", filename, status, dbErr)
			}
		}

		// Terminate the processing if the migration failed to install
		if err != nil {
			return err
		}

		// Migration processed successfully: register it in the database, updating the checksum if necessary
		if err := db.ExecuteOne(
			db.Dialect().
				Insert("cm_migrations").
				Rows(goqu.Record{
					"filename": filename,
					"md5":      util.MD5ToHex(&csActual),
				}).
				OnConflict(goqu.DoUpdate(
					"filename",
					goqu.Record{"md5": util.MD5ToHex(&csActual), "ts_installed": time.Now().UTC()})),
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

	// Install seed SQL, if any
	if seed != "" {
		// Preprocess the seed to tailor relative dates and binary data to the used database
		reRelDate := regexp.MustCompile(`SEED_NOW\(([^)]+)\)`)
		reBinary := regexp.MustCompile(`SEED_BINARY\('([^)]+)'\)`)
		switch db.dialect {
		case dbPostgres:
			seed = reRelDate.ReplaceAllString(seed, "current_timestamp + interval $1")
			seed = reBinary.ReplaceAllString(seed, `E'\\x$1'`)
		case dbSQLite3:
			seed = reRelDate.ReplaceAllString(seed, "datetime('now', $1)")
			seed = reBinary.ReplaceAllString(seed, `x'$1'`)
		default:
			return errUnknownDialect
		}

		// Run the seed script
		if _, err := db.db.Exec(seed); err != nil {
			return err
		}
	}

	// Succeeded
	return nil
}

// RecreateSchema drops and recreates the public schema
func (db *Database) RecreateSchema() error {
	logger.Debug("db.RecreateSchema()")

	switch db.dialect {
	case dbPostgres:
		// Drop the public schema
		if _, err := db.db.Exec("drop schema public cascade"); err != nil {
			return err
		}

		// Create the public schema
		if _, err := db.db.Exec("create schema public"); err != nil {
			return err
		}

	case dbSQLite3:
		// Disconnect from the DB
		if err := db.Shutdown(); err != nil {
			return err
		}

		// Remove the database file
		if err := os.Remove(config.SecretsConfig.SQLite3.File); err != nil {
			return err
		}

		// Reconnect
		if err := db.connect(); err != nil {
			return err
		}

	default:
		return errUnknownDialect
	}
	return nil
}

// Select executes the provided goqu query against the database
func (db *Database) Select(e exp.SQLExpression) (*sql.Rows, error) {
	// Convert the expression into SQL and params
	eSQL, eParams, err := setPrepared(e).ToSQL()
	if err != nil {
		return nil, err
	}

	// Debug logging
	db.debugLogSQL("Select", eSQL, eParams)

	// Execute the query
	return db.db.Query(eSQL, eParams...)
}

// SelectStructs executes the provided goqu query against the database and populates the provided target []struct
func (db *Database) SelectStructs(ds *goqu.SelectDataset, target any) error {
	// Turn Prepared on
	ds = ds.Prepared(true)

	// Debug logging
	db.debugLog("SelectStructs", ds)

	// Execute the query and collect the results
	return ds.ScanStructs(target)
}

// SelectRow executes the provided goqu query against the database, returning a single row
func (db *Database) SelectRow(e exp.SQLExpression) intf.Scanner {
	// Convert the expression into SQL and params
	eSQL, eParams, err := setPrepared(e).ToSQL()
	if err != nil {
		return util.NewErrScanner(err)
	}

	// Debug logging
	db.debugLogSQL("SelectRow", eSQL, eParams)

	// Execute the query
	return db.db.QueryRow(eSQL, eParams...)
}

// SelectVals executes the provided single-column goqu query against the database and populates the provided slice of a
// primitive type
func (db *Database) SelectVals(ds *goqu.SelectDataset, target any) error {
	// Turn Prepared on
	ds = ds.Prepared(true)

	// Debug logging
	db.debugLog("SelectVals", ds)

	// Execute the query and collect the results
	return ds.ScanVals(target)
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

// StartOfDay returns an expression for truncating the given datetime column to the start of day
func (db *Database) StartOfDay(col string) exp.LiteralExpression {
	switch db.dialect {
	case dbPostgres:
		col = fmt.Sprintf("date_trunc('day', %s)", col)
	case dbSQLite3:
		col = fmt.Sprintf("strftime('%%FT00:00:00Z', %s)", col)
	}
	return goqu.L(col)
}

// Version returns the actual database server version
func (db *Database) Version() string {
	// Lazy-load the version
	if db.version == "" {
		// Try to fetch the version using the appropriate command
		var err error
		switch db.dialect {
		case dbPostgres:
			err = db.db.QueryRow("select version()").Scan(&db.version)
		case dbSQLite3:
			err = db.db.QueryRow("select sqlite_version()").Scan(&db.version)
			db.version = "SQLite " + db.version
		default:
			err = errUnknownDialect
		}

		// Check if fetching failed
		if err != nil {
			db.version = fmt.Sprintf("(failed to retrieve: %v)", err)
		}
	}
	return db.version
}

// connect establishes a database connection up to the configured number of attempts
func (db *Database) connect() error {
	logger.Infof("Connecting to database %s", db.getConnectString(true))

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
	db.db.SetMaxIdleConns(config.ServerConfig.DBIdleConns)

	// Succeeded
	logger.Infof("Connected to database version %q", db.Version())
	return nil
}

// debugLog logs the SQL statement in the passed expression, if database debug logging is on
func (db *Database) debugLog(methodName string, e exp.SQLExpression) exp.SQLExpression {
	if db.debug {
		if s, a, err := e.ToSQL(); err != nil {
			logger.Errorf("db.%s(): failed to generate SQL for expression: %v", methodName, err)
		} else {
			db.debugLogSQL(methodName, s, a)
		}
	}
	return e
}

// debugLog logs an already generated SQL statement, if database debug logging is on
func (db *Database) debugLogSQL(methodName, statement string, args any) {
	if db.debug {
		logger.Debugf("db.%s()\n - SQL: %s\n - Args: %#v", methodName, statement, args)
	}
}

// getAvailableMigrations returns a list of available database migration files
func (db *Database) getAvailableMigrations() ([]string, error) {
	// Scan the migrations dir for available migration files. Files reside in a subdirectory whose name matches the DB
	// dialect in use
	dir := path.Join(config.ServerConfig.DBMigrationPath, string(db.dialect))
	files, err := os.ReadDir(dir)
	if err != nil {
		logger.Errorf("Failed to read DB migrations dir %q: %v", dir, err)
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
	logger.Infof("Discovered %d database migrations in %s", len(list), dir)
	return list, err
}

// getConnectString returns a string description of the database connection, optionally masking the password
func (db *Database) getConnectString(mask bool) string {
	switch db.dialect {
	case dbPostgres:
		return fmt.Sprintf(
			"postgres://%s:%s@%s:%d/%s?sslmode=%s",
			config.SecretsConfig.Postgres.Username,
			util.If(mask, "********", config.SecretsConfig.Postgres.Password),
			config.SecretsConfig.Postgres.Host,
			config.SecretsConfig.Postgres.Port,
			config.SecretsConfig.Postgres.Database,
			config.SecretsConfig.Postgres.SSLMode)
	case dbSQLite3:
		// Enable the enforcement of foreign keys
		return fmt.Sprintf("%s?_fk=true", config.SecretsConfig.SQLite3.File)
	}
	return "(?)"
}

// getInstalledMigrations returns a map of installed database migrations (filename: md5)
func (db *Database) getInstalledMigrations() (map[string][16]byte, error) {
	// If no migrations table is present, it means no migration is installed either (the schema is most likely empty)
	if exists, err := db.tableExists("cm_migrations"); err != nil {
		return nil, err
	} else if !exists {
		return nil, nil
	}

	type migrationRec struct {
		Filename string `db:"filename"`
		MD5      string `db:"md5"`
	}

	// Query the migrations table
	var recs []migrationRec
	if err := db.SelectStructs(db.DB().From("cm_migrations").Select(&migrationRec{}), &recs); err != nil {
		return nil, fmt.Errorf("getInstalledMigrations: SelectStructs() failed: %w", err)
	}

	// Convert the files into a map
	migMap := make(map[string][16]byte)
	for _, mr := range recs {
		// Parse the sum as binary
		if b, err := hex.DecodeString(mr.MD5); err != nil {
			return nil, fmt.Errorf("getInstalledMigrations: failed to decode MD5 checksum for migration '%s': %v", mr.Filename, err)
		} else if l := len(b); l != 16 {
			return nil, fmt.Errorf("getInstalledMigrations: wrong MD5 checksum length for migration '%s': got %d, want 16", mr.Filename, l)
		} else {
			var b16 [16]byte
			copy(b16[:], b)
			migMap[mr.Filename] = b16
		}
	}

	// Succeeded
	return migMap, nil
}

// installMigration installs a database migration contained in the given file, returning its actual MD5 checksum and the
// status
func (db *Database) installMigration(filename string, csExpected *[16]byte) (csActual [16]byte, status string, err error) {
	status = "failed"

	// Read in the content of the file
	fullName := path.Join(config.ServerConfig.DBMigrationPath, string(db.dialect), filename)
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
	if _, err = db.db.Exec(string(contents)); err != nil {
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

// tableExists returns whether table with the specified name exists
func (db *Database) tableExists(name string) (bool, error) {
	var sd *goqu.SelectDataset
	switch db.dialect {
	case dbPostgres:
		sd = db.Dialect().From("pg_tables").Select(goqu.COUNT("*")).Where(goqu.Ex{"schemaname": "public", "tablename": name})
	case dbSQLite3:
		sd = db.Dialect().From("sqlite_master").Select(goqu.COUNT("*")).Where(goqu.Ex{"type": "table", "name": name})
	default:
		return false, errUnknownDialect
	}

	// Query the DB
	var cnt int
	if err := db.SelectRow(sd).Scan(&cnt); err != nil {
		return false, err
	}

	// Succeeded
	return cnt > 0, nil
}

// tryConnect tries to establish a database connection, once
func (db *Database) tryConnect(num, total int) (err error) {
	db.db, err = sql.Open(string(db.dialect), db.getConnectString(false))

	// Failed to connect
	if err != nil {
		logger.Warningf("[Attempt %d/%d] Failed to connect to database: %v", num, total, err)
		return
	}

	// Connected successfully. Verify the connection by issuing a ping
	err = db.db.Ping()
	if err != nil {
		logger.Warningf("[Attempt %d/%d] Failed to ping database: %v", num, total, err)
	}
	return
}

// setPrepared tries to set the Prepared to true on the given expression
func setPrepared(e exp.SQLExpression) exp.SQLExpression {
	switch x := e.(type) {
	case *goqu.DeleteDataset:
		return x.Prepared(true)
	case *goqu.InsertDataset:
		return x.Prepared(true)
	case *goqu.SelectDataset:
		return x.Prepared(true)
	case *goqu.TruncateDataset:
		return x.Prepared(true)
	case *goqu.UpdateDataset:
		return x.Prepared(true)
	}

	// No luck, pass e through
	return e
}
