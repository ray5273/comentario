package intf

import (
	"time"
)

// VersionService is a service interface for managing versions
type VersionService interface {
	// BuildDate returns the application build date
	BuildDate() time.Time
	// CurrentVersion returns the current Comentario version
	CurrentVersion() string
	// DBVersion returns the actual database server version in use
	DBVersion() string
	// Init initialises the service
	Init(curVersion, buildDate string)
	// IsUpgradable returns whether the LatestRelease().Version > CurrentVersion()
	IsUpgradable() bool
	// LatestRelease returns the latest Comentario release metadata, if any, or nil otherwise
	LatestRelease() ReleaseMetadata
}

// ReleaseMetadata holds release information
type ReleaseMetadata interface {
	// Name returns release name
	Name() string
	// Version returns the released version
	Version() string
	// PageURL returns the release page URL
	PageURL() string
}

// Mailer allows sending emails
type Mailer interface {
	// Operational returns whether the mailer is functional (used to distinguish between a "real" mailer and noOpMailer)
	Operational() bool
	// Mail sends an email to the specified recipient.
	//  - replyTo:     email address/name of the sender (optional).
	//  - recipient:   email address/name of the recipient.
	//  - subject:     email subject.
	//  - htmlMessage: email text in the HTML format.
	//  - embedFiles:  files to be embedded in the email
	Mail(replyTo, recipient, subject, htmlMessage string, embedFiles ...string) error
}

// PathRegistry represents a list of paths. Each path entry assumes anything below it (i.e. starting with it) matches,
// too
type PathRegistry interface {
	// Add adds paths to the list
	Add(path ...string)
	// Has returns true if the given path, or its starting path, is in the list
	Has(path string) bool
}

// Scanner is a database/sql abstraction interface that can be used with both *sql.Row and *sql.Rows
type Scanner interface {
	// Err returns the error, if any
	Err() error
	// Scan copies columns from the underlying query row(s) to the values pointed to by dest
	Scan(dest ...any) error
}
