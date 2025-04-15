package svc

import (
	"encoding/json"
	"fmt"
	"github.com/hashicorp/go-version"
	"gitlab.com/comentario/comentario/internal/intf"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"strings"
	"sync"
	"time"
)

// releaseMetadata represents GitLab release information and implements intf.ReleaseMetadata
type releaseMetadata struct {
	RName   string `json:"name"`     // Release name
	TagName string `json:"tag_name"` // Released version
	Links   struct {
		Self string `json:"self"`
	} `json:"_links"` // Release HATEOAS links
}

func (rm *releaseMetadata) Name() string {
	return rm.RName
}

func (rm *releaseMetadata) Version() string {
	return rm.TagName
}

func (rm *releaseMetadata) PageURL() string {
	return rm.Links.Self
}

//----------------------------------------------------------------------------------------------------------------------

// versionService is a blueprint VersionService implementation
type versionService struct {
	built      time.Time            // Application build date
	cur        string               // The current Comentario version
	latestRM   intf.ReleaseMetadata // Latest release metadata
	latestDate time.Time            // When latestRM was last fetched
	latestMu   sync.Mutex           // Mutex for latestRM
}

func (svc *versionService) BuildDate() time.Time {
	return svc.built
}
func (svc *versionService) CurrentVersion() string {
	return svc.cur
}

func (svc *versionService) DBVersion() string {
	return Services.DBVersion()
}

func (svc *versionService) Init(curVersion, buildDate string) {
	fmt.Printf("Comentario server, version %s, built %s\n", curVersion, buildDate)

	svc.cur = curVersion
	svc.built, _ = time.Parse(time.RFC3339, buildDate)
}

func (svc *versionService) IsUpgradable() bool {
	// Try to obtain the latest stable version
	if rm := svc.LatestRelease(); rm != nil {
		// Remove any prerelease spec from the current version (coming after a '-'). So in this context, we'll consider
		// "3.7.0-14-g858c6da" equivalent to "3.7.0". The standard semver handling would consider
		// "3.7.0-14-g858c6da" < "3.7.0", whereas it's in fact the opposite, it's newer than "3.7.0". It's caused by the
		// way we assign versions using "git describe --tags": git takes the latest tag and appends a string to it; if
		// done properly, the version would have to be incremented first
		cv := strings.SplitN(svc.cur, "-", 2)

		// Parse the current version
		if vc, err := version.NewVersion(cv[0]); err == nil {
			// Parse the latest released version
			if vl, err := version.NewVersion(rm.Version()); err == nil {
				// Compare
				return vc.LessThan(vl)
			}
		}
	}
	return false
}

func (svc *versionService) LatestRelease() intf.ReleaseMetadata {
	svc.latestMu.Lock()
	defer svc.latestMu.Unlock()

	// Lazily fetch the latest release, expiring the result after 6 hours
	if now := time.Now().UTC(); now.Sub(svc.latestDate) > 6*time.Hour {
		// Try to fetch the latest available release. Log any error, but don't otherwise interrupt the flow; latest will
		// be set to nil in that case
		var err error
		if svc.latestRM, err = svc.fetchLatest(); err != nil {
			logger.Warningf("versionService: failed to fetch latest release: %v", err)
		}
		svc.latestDate = now
	}
	return svc.latestRM
}

func (svc *versionService) fetchLatest() (intf.ReleaseMetadata, error) {
	logger.Debug("versionService.fetchLatest()")

	// Fetch the releases
	resp, err := http.Get(util.GitLabReleasesURL)
	if err != nil {
		return nil, err
	}
	defer util.LogError(resp.Body.Close, "versionService.fetchLatest, resp.Body.Close()")

	// Unmarshal the result
	dec := json.NewDecoder(resp.Body)

	// Read open bracket
	if t, err := dec.Token(); err != nil {
		return nil, fmt.Errorf("versionService.fetchLatest/dec.Token: %w", err)
	} else if s, ok := t.(fmt.Stringer); !ok || s.String() != "[" {
		return nil, fmt.Errorf("versionService.fetchLatest: malformed JSON response, want '[', got %v", t)
	}

	// Read and unmarshal the next value from the array
	var rm releaseMetadata
	for dec.More() {
		if err := dec.Decode(&rm); err != nil {
			return nil, fmt.Errorf("versionService.fetchLatest/dec.Decode: %w", err)
		}
		// Exit after the first occurrence: the releases are supposed to be returned in reverse chronological order, so
		// the topmost item is the latest release
		break
	}

	// Sanity check
	if rm.RName == "" || rm.TagName == "" || rm.Links.Self == "" {
		return nil, nil
	}

	// Succeeded
	logger.Debugf("versionService: fetched latest release metadata: %q (%s)", rm.RName, rm.TagName)
	return &rm, nil
}
