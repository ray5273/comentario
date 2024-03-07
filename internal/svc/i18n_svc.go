package svc

import (
	"fmt"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"gopkg.in/yaml.v3"
	"path"
	"reflect"
)

// TheI18nService is a global I18nService implementation
var TheI18nService I18nService = &i18nService{
	locs: make(map[string]*i18n.Localizer),
}

// I18nService is a service interface for dealing with translations and internationalisation (i18)
type I18nService interface {
	// Init the service
	Init() error
	// Translate translates the provided ID into the given language
	Translate(lang, id string, args ...reflect.Value) string
}

//----------------------------------------------------------------------------------------------------------------------

// i18nService is a blueprint I18nService implementation
type i18nService struct {
	bundle *i18n.Bundle               // Internationalisation bundle
	defLoc *i18n.Localizer            // Localizer for the default language
	locs   map[string]*i18n.Localizer // Map of localizers by the language
}

func (svc i18nService) Init() error {
	logger.Debug("i18nService.Init()")

	// Create a localisation bundle
	svc.bundle = i18n.NewBundle(util.UILanguageTags[0])
	svc.bundle.RegisterUnmarshalFunc("yaml", yaml.Unmarshal)

	// Iterate and load available translation files
	if err := svc.scanDir("."); err != nil {
		return err
	}

	// Identify the fallback localizer
	if loc, ok := svc.locs[util.UIDefaultLangID]; !ok {
		return fmt.Errorf("unable to find localizer for language %q", util.UIDefaultLangID)
	} else {
		svc.defLoc = loc
	}

	// Succeeded
	return nil
}

func (svc i18nService) Translate(lang, id string, args ...reflect.Value) string {
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
func (svc i18nService) scanDir(dirPath string) error {
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

		// Create a localizer per language
		lang := mf.Tag.String()
		svc.locs[lang] = i18n.NewLocalizer(svc.bundle, lang, util.UIDefaultLangID)
		logger.Debugf("Loaded i18n file %q for language %q", fp, lang)
	}

	// Succeeded
	return nil
}
