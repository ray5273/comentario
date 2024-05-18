package main

import (
	"gitlab.com/comentario/comentario/internal/intf"
	"strings"
	"time"
)

//----------------------------------------------------------------------------------------------------------------------

// e2eVersionService is a dummy VersionService implementation
type e2eVersionService struct {
	built    time.Time           // Application build date
	cur      string              // The current Comentario version
	latestRM *e2eReleaseMetadata // Latest release metadata
}

func (svc *e2eVersionService) BuildDate() time.Time {
	return svc.built
}

func (svc *e2eVersionService) CurrentVersion() string {
	return svc.cur
}

func (svc *e2eVersionService) DBVersion() string {
	return "Multigalactic DB v417"
}

func (svc *e2eVersionService) Init(string, string) {
	// Stub
}

func (svc *e2eVersionService) IsUpgradable() bool {
	// Just compare versions as strings
	return svc.cur < strings.TrimPrefix(svc.latestRM.Version(), "v")
}

func (svc *e2eVersionService) LatestRelease() intf.ReleaseMetadata {
	return svc.latestRM
}

//----------------------------------------------------------------------------------------------------------------------

// e2eReleaseMetadata implements intf.ReleaseMetadata
type e2eReleaseMetadata struct {
	name    string
	version string
	pageURL string
}

func (rm *e2eReleaseMetadata) Name() string {
	return rm.name
}

func (rm *e2eReleaseMetadata) Version() string {
	return rm.version
}

func (rm *e2eReleaseMetadata) PageURL() string {
	return rm.pageURL
}
