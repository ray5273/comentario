package svc

import (
	"fmt"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/text/language"
	"gopkg.in/yaml.v3"
	"net/http"
	"path"
	"reflect"
	"slices"
	"strings"
)

// TheI18nService is a global I18nService implementation
var TheI18nService I18nService = newI18nService()

// I18nService is a service interface for dealing with translations and internationalisation (i18)
type I18nService interface {
	// FrontendURL returns the complete absolute URL for the given frontend (Admin UI) language and sub-path, with
	// optional query params. If the path is empty, returns the language root path
	FrontendURL(lang, subPath string, queryParams map[string]string) string
	// GuessFrontendUserLanguage tries to identify the most appropriate frontend (Admin UI) language for the user based
	// on the request URL path, the user's language cookie and/or browser preferences, amongst those supported, and
	// returns it as a 2-letter code.
	GuessFrontendUserLanguage(r *http.Request) string
	// Init the service
	Init() error
	// IsFrontendLang returns whether the provided string is a supported frontend (Admin UI) language
	IsFrontendLang(s string) bool
	// IsFrontendTag returns whether the provided language tag is a supported frontend (Admin UI) language
	IsFrontendTag(tag language.Tag) bool
	// LangTags returns tags of supported interface languages
	LangTags() []language.Tag
	// Messages returns all messages in the form of an ID-indexed map for the given language
	Messages(lang string) (map[string]string, error)
	// Translate translates the provided ID into the given language
	Translate(lang, id string, args ...reflect.Value) string
}

//----------------------------------------------------------------------------------------------------------------------

// newI18nService creates a new I18nService
func newI18nService() *i18nService {
	return &i18nService{
		locs:      make(map[string]*i18n.Localizer),
		msgs:      make(map[string]map[string]string),
		feMatcher: language.NewMatcher(util.FrontendLanguages),
	}
}

// i18nService is a blueprint I18nService implementation
type i18nService struct {
	bundle    *i18n.Bundle                 // Internationalisation bundle
	defLoc    *i18n.Localizer              // Localizer for the default language
	tags      []language.Tag               // Available language tags
	locs      map[string]*i18n.Localizer   // Map of localizers by the language
	msgs      map[string]map[string]string // Map of messages[ID] by the language
	feMatcher language.Matcher             // Frontend language matcher
}

func (svc *i18nService) FrontendURL(lang, subPath string, queryParams map[string]string) string {
	// Make sure the language is correct
	if !svc.IsFrontendLang(lang) {
		lang = util.DefaultLanguage.String()
	}
	return config.URLFor(fmt.Sprintf("%s/%s", lang, subPath), queryParams)
}

func (svc *i18nService) GuessFrontendUserLanguage(r *http.Request) string {
	// First, analyze the requested path. If it's under a language root, use that language
	if ok, p := config.PathOfBaseURL(r.URL.Path); ok && len(p) >= 3 && p[2] == '/' && svc.IsFrontendLang(p[0:2]) {
		return p[0:2]
	}

	// Next, try to extract the preferred language from a cookie
	cookieLang := ""
	if c, _ := r.Cookie("lang"); c != nil {
		cookieLang = c.Value
	}

	// Find the best match based on the cookie and/or browser header
	tag, _ := language.MatchStrings(svc.feMatcher, cookieLang, r.Header.Get("Accept-Language"))
	base, _ := tag.Base()
	return base.String()
}

func (svc *i18nService) Init() error {
	logger.Debug("i18nService.Init()")

	// Create a localisation bundle
	svc.bundle = i18n.NewBundle(util.DefaultLanguage)
	svc.bundle.RegisterUnmarshalFunc("yaml", yaml.Unmarshal)

	// Iterate and load available translation files
	if err := svc.scanDir("."); err != nil {
		return err
	}

	// Sort translations by language code
	slices.SortFunc(svc.tags, func(a, b language.Tag) int {
		// The default language must always come first
		if a == util.DefaultLanguage {
			return -1
		} else if b == util.DefaultLanguage {
			return 1
		}
		return strings.Compare(a.String(), b.String())
	})

	// Identify the fallback localizer
	if loc, ok := svc.locs[util.DefaultLanguage.String()]; !ok {
		return fmt.Errorf("unable to find localizer for language %q", util.DefaultLanguage)
	} else {
		svc.defLoc = loc
	}

	// Make sure every ID present in the default language has a (fallback) message in every other language
	defMM := svc.msgs[util.DefaultLanguage.String()]
	for lang, mm := range svc.msgs {
		// Skip the default language
		if lang == util.DefaultLanguage.String() {
			continue
		}
		// Iterate all messages in the default language
		for id, msg := range defMM {
			if _, ok := mm[id]; !ok {
				logger.Debugf("i18nService: language %q: message with ID=%q wasn't found, falling back to default", lang, id)
				mm[id] = msg
			}
		}
	}

	// Succeeded
	return nil
}

func (svc *i18nService) IsFrontendLang(s string) bool {
	// Search through the available languages to find one whose base matches the string
	for _, t := range util.FrontendLanguages {
		if base, _ := t.Base(); base.String() == s {
			return true
		}
	}
	return false
}

func (svc *i18nService) IsFrontendTag(tag language.Tag) bool {
	return slices.Contains(util.FrontendLanguages, tag)
}

func (svc *i18nService) LangTags() []language.Tag {
	return svc.tags
}

func (svc *i18nService) Messages(lang string) (map[string]string, error) {
	// Try to find the messages map for the required language
	if ms, ok := svc.msgs[lang]; ok {
		return ms, nil
	}
	return nil, ErrNotFound
}

func (svc *i18nService) Translate(lang, id string, args ...reflect.Value) string {
	// Find a localizer to use
	loc, ok := svc.locs[lang]
	if !ok {
		loc = svc.defLoc
	}

	// Translate
	if s, err := loc.Localize(&i18n.LocalizeConfig{MessageID: id, TemplateData: args}); err == nil {
		return s
	} else {
		return fmt.Sprintf("!%v", err)
	}
}

// scanDir recursively scans the provided directory and collects translations from found files
func (svc *i18nService) scanDir(dirPath string) error {
	fs, err := config.I18nFS.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read i18n directory: %w", err)
	}

	// Iterate all entries
	for _, f := range fs {
		fp := path.Join(dirPath, f.Name())

		// If it's a directory, dive into it
		if f.IsDir() {
			if err := svc.scanDir(fp); err != nil {
				return err
			}
			continue
		}

		// It's a translation file: load it
		mf, err := svc.bundle.LoadMessageFileFS(config.I18nFS, fp)
		if err != nil {
			return fmt.Errorf("failed to read i18n file %q: %w", fp, err)
		}

		// Store the tag and the messages
		svc.tags = append(svc.tags, mf.Tag)
		lang := mf.Tag.String()
		svc.msgs[lang] = makeMsgMap(mf.Messages)

		// Create a localizer per language
		svc.locs[lang] = i18n.NewLocalizer(svc.bundle, lang, util.DefaultLanguage.String())
		logger.Debugf("Loaded i18n file %q for language %q (%d messages)", fp, lang, len(mf.Messages))
	}

	// Succeeded
	return nil
}

// makeMsgMap converts a message slice into an ID-indexed string map
func makeMsgMap(ms []*i18n.Message) map[string]string {
	mm := make(map[string]string, len(ms))
	for _, m := range ms {
		mm[m.ID] = m.Other
	}
	return mm
}
