package persistence

import (
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/dialect/sqlite3"
)

func DialectOptions() *goqu.SQLDialectOptions {
	opts := sqlite3.DialectOptions()

	// The original sqlite3 implementation incorrectly marks RETURNING as unsupported, see
	// https://github.com/doug-martin/goqu/issues/432
	opts.SupportsReturn = true

	// The original sqlite3 implementation thinks UPDATE ... FROM is unsupported, see
	// https://github.com/doug-martin/goqu/issues/441
	opts.SupportsMultipleUpdateTables = true
	return opts
}

func init() {
	goqu.RegisterDialect("sqlite3ex", DialectOptions())
}
