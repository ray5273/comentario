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
	_ "github.com/doug-martin/goqu/v9/dialect/postgres" // PostgreSQL goqu dialect
	"github.com/doug-martin/goqu/v9/exec"
	"github.com/doug-martin/goqu/v9/exp"
	_ "github.com/lib/pq"           // PostgreSQL driver
	_ "github.com/mattn/go-sqlite3" // SQLite3 driver
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/extend/intf"
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

// dbDialect represents the database dialect in use. In terms of values it's compatible with sql's driverName and
// goqu's dialect string
type dbDialect string

// dialectWrapper returns the goqu dialect wrapper to use for this dialect
func (d dbDialect) dialectWrapper() goqu.DialectWrapper {
	// Replace the sqlite3 dialect with our own fixed implementation
	s := string(d)
	if s == "sqlite3" {
		s = "sqlite3ex"
	}
	return goqu.Dialect(s)
}

const (
	dbPostgres dbDialect = "postgres"
	dbSQLite3  dbDialect = "sqlite3"
)

var errUnknownDialect = errors.New("unknown DB dialect")

// Executable encapsulates a method that returns a query executor. Declared here for the lack of one in goqu
type Executable interface {
	Executor() exec.QueryExecutor
}

//----------------------------------------------------------------------------------------------------------------------

// goquLoggerFunc is an adapter that turns a compatible function into a goqu.Logger implementation
type goquLoggerFunc func(format string, v ...any)

func (f goquLoggerFunc) Printf(format string, v ...any) {
	f(format, v...)
}

// ---------------------------------------------------------------------------------------------------------------------

// Migration represents a database migration record
type Migration struct {
	Filename      string    `db:"filename" goqu:"skipupdate"` // Unique DB migration file name
	InstalledTime time.Time `db:"ts_installed"`               // Timestamp when the migration was installed
	MD5           string    `db:"md5"`                        // MD5 checksum of the migration file content
}

// MD5Bytes returns the migration's MD5 checksum as a byte slice
func (m *Migration) MD5Bytes() ([]byte, error) {
	return hex.DecodeString(m.MD5)
}

// ---------------------------------------------------------------------------------------------------------------------

// MigrationLogEntry represents a database migration log record
type MigrationLogEntry struct {
	Filename    string         `db:"filename"`     // DB migration file name
	CreatedTime time.Time      `db:"ts_created"`   // Timestamp when the record was created
	MD5Expected string         `db:"md5_expected"` // Expected MD5 checksum of the migration file content
	MD5Actual   string         `db:"md5_actual"`   // Actual MD5 checksum of the migration file content
	Status      string         `db:"status"`       // Migration status: 'installed', 'reinstalled', 'failed', 'skipped'
	ErrorText   sql.NullString `db:"error_text"`   // Optional error text is is_ok is false
}

//----------------------------------------------------------------------------------------------------------------------

// DBX is a database query/statement executor interface, implemented by both Database and DB transaction
type DBX interface {
	// Delete returns a new DeleteDataset
	Delete(table any) *goqu.DeleteDataset
	// From returns a new SelectDataset
	From(v ...any) *goqu.SelectDataset
	// Insert returns a new InsertDataset
	Insert(table any) *goqu.InsertDataset
	// Update returns a new UpdateDataset
	Update(table any) *goqu.UpdateDataset
}

//----------------------------------------------------------------------------------------------------------------------

// Database is an opaque structure providing database operations and implementing DBX
type Database struct {
	dialect     dbDialect   // Database dialect in use
	debug       bool        // Whether debug logging is enabled
	debugLogger goqu.Logger // Database logger instance when debug logging is enabled
	db          *sql.DB     // Internal SQL database instance
	doneConn    chan bool   // Receives a true when the connection process has been finished (successfully or not)
	version     string      // Actual database server version
}

// InitDB establishes a database connection
func InitDB() (*Database, error) {
	// Set up goqu options
	goqu.SetIgnoreUntaggedFields(true)
	goqu.SetDefaultPrepared(true)

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

	// Create a logger if debug logging is enabled
	if db.debug {
		db.debugLogger = goquLoggerFunc(logger.Debugf)
	}

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

// Begin initiates and returns a new transaction
func (db *Database) Begin() (*DatabaseTx, error) {
	if gtx, err := db.goquDB().Begin(); err != nil {
		return nil, err
	} else {
		return &DatabaseTx{tx: gtx}, nil
	}
}

func (db *Database) Delete(table any) *goqu.DeleteDataset {
	return db.goquDB().Delete(table)
}

func (db *Database) From(v ...any) *goqu.SelectDataset {
	return db.goquDB().From(v...)
}

func (db *Database) Insert(table any) *goqu.InsertDataset {
	return db.goquDB().Insert(table)
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
		var errMsg sql.NullString
		if err != nil {
			errMsg.Valid = true
			errMsg.String = err.Error()
		}

		// If something was actually done
		if status != "" {
			// Add a log record, logging any error to the console
			if dbErr := ExecOne(db.Insert("cm_migration_log").Rows(&MigrationLogEntry{
				Filename:    filename,
				CreatedTime: time.Now().UTC(),
				MD5Expected: util.MD5ToHex(csExpected),
				MD5Actual:   util.MD5ToHex(&csActual),
				Status:      status,
				ErrorText:   errMsg,
			})); dbErr != nil {
				logger.Errorf("Failed to add migration log record for '%s' (status '%s'): %v", filename, status, dbErr)
			}
		}

		// Terminate the processing if the migration failed to install
		if err != nil {
			return err
		}

		// Migration processed successfully: register it in the database, updating the checksum if necessary
		mig := &Migration{
			Filename:      filename,
			InstalledTime: time.Now().UTC(),
			MD5:           util.MD5ToHex(&csActual),
		}
		if err := ExecOne(db.Insert("cm_migrations").Rows(mig).OnConflict(goqu.DoUpdate("filename", mig))); err != nil {
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

// Update returns a new UpdateDataset
func (db *Database) Update(table any) *goqu.UpdateDataset {
	return db.goquDB().Update(table)
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

// WithTx runs the provided function in the context of a transaction, which is created before calling the function and
// either committed or rolled back (if the function returned an error)
func (db *Database) WithTx(f func(tx *DatabaseTx) error) (err error) {
	// Initiate a transaction
	tx, err := db.Begin()
	if err != nil {
		logger.Errorf("Database.WithTx/Begin: %v", err)
		return err
	}

	// Call the wrapped function, providing it with an instance of the transaction
	defer func() {
		if p := recover(); p != nil {
			logger.Errorf("Database.WithTx: panic from func: %v", p)
			_ = tx.Rollback()
			panic(p)
		}
		if err != nil {
			logger.Errorf("Database.WithTx/func(): %v", err)
			if e := tx.Rollback(); e != nil {
				logger.Errorf("Database.WithTx/post-func Rollback: %v", err)
				err = e
			}
		} else if e := tx.Commit(); e != nil {
			logger.Errorf("Database.WithTx/post-func Commit: %v", err)
			err = e
		}
	}()
	return f(tx)
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
		return config.SecretsConfig.Postgres.ConnectString(mask)
	case dbSQLite3:
		return config.SecretsConfig.SQLite3.ConnectString()
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

	// Query the migrations table
	var dbRecs []Migration
	if err := db.From("cm_migrations").ScanStructs(&dbRecs); err != nil {
		return nil, fmt.Errorf("Database.getInstalledMigrations/ScanStructs: %w", err)
	}

	// Convert the files into a map
	migMap := make(map[string][16]byte)
	for _, r := range dbRecs {
		// Parse the sum as binary
		if b, err := r.MD5Bytes(); err != nil {
			return nil, fmt.Errorf("Database.getInstalledMigrations: failed to decode MD5 checksum for migration '%s': %v", r.Filename, err)
		} else if l := len(b); l != 16 {
			return nil, fmt.Errorf("Database.getInstalledMigrations: wrong MD5 checksum length for migration '%s': got %d, want 16", r.Filename, l)
		} else {
			var b16 [16]byte
			copy(b16[:], b)
			migMap[r.Filename] = b16
		}
	}

	// Succeeded
	return migMap, nil
}

// goquDB returns a goqu.Database to use for queries
func (db *Database) goquDB() *goqu.Database {
	gd := db.dialect.dialectWrapper().DB(db.db)
	gd.Logger(db.debugLogger)
	return gd
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
		sd = db.From("pg_tables").Where(goqu.Ex{"schemaname": "public", "tablename": name})
	case dbSQLite3:
		sd = db.From("sqlite_master").Where(goqu.Ex{"type": "table", "name": name})
	default:
		return false, errUnknownDialect
	}

	// Query the DB
	cnt, err := sd.Count()
	if err != nil {
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

//----------------------------------------------------------------------------------------------------------------------

// DatabaseTx represents a database transaction, implementing DBX
type DatabaseTx struct {
	tx    *goqu.TxDatabase // Reference to the underlying transaction
	cc    []intf.Tx        // Child transactions, which get commited and rolled back together with (prior to) this one
	stale bool             // Whether the transaction is ended and hence unusable
}

// AddChild adds a child transaction to the transaction
func (dt *DatabaseTx) AddChild(tx intf.Tx) {
	dt.cc = append(dt.cc, tx)
}

// Commit the transaction
func (dt *DatabaseTx) Commit() error {
	defer func() { dt.stale = true }()
	// Commit all child transactions
	for _, c := range dt.cc {
		if err := c.Commit(); err != nil {
			return err
		}
	}
	// Commit the DB transaction
	return dt.tx.Commit()
}

// Delete implementation of DBX
func (dt *DatabaseTx) Delete(table any) *goqu.DeleteDataset {
	dt.checkStale()
	return dt.tx.Delete(table)
}

// From implementation of DBX
func (dt *DatabaseTx) From(v ...any) *goqu.SelectDataset {
	dt.checkStale()
	return dt.tx.From(v...)
}

// Insert implementation of DBX
func (dt *DatabaseTx) Insert(table any) *goqu.InsertDataset {
	dt.checkStale()
	return dt.tx.Insert(table)
}

// Rollback the transaction
func (dt *DatabaseTx) Rollback() error {
	defer func() { dt.stale = true }()
	// Roll back all child transactions
	for _, c := range dt.cc {
		if err := c.Rollback(); err != nil {
			return err
		}
	}
	// Roll back the DB transaction
	return dt.tx.Rollback()
}

// Update implementation of DBX
func (dt *DatabaseTx) Update(table any) *goqu.UpdateDataset {
	dt.checkStale()
	return dt.tx.Update(table)
}

// checkStale panics if the transaction is stale
func (dt *DatabaseTx) checkStale() {
	if dt.stale {
		panic("transaction is stale and hence unusable")
	}
}

//----------------------------------------------------------------------------------------------------------------------

// ExecOne executes the provided Executable statement and verifies there's exactly one row affected
func ExecOne(x Executable) error {
	// Run the statement
	if res, err := x.Executor().Exec(); err != nil {
		return err
	} else if cnt, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("RowsAffected: %v", err)
	} else if cnt == 0 {
		return sql.ErrNoRows
	} else if cnt != 1 {
		return fmt.Errorf("statement affected %d rows, want 1", cnt)
	}

	// Succeeded
	return nil
}
