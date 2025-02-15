package main

//go:generate rm -rf internal/api/models internal/api/restapi/operations
//go:generate swagger generate server --exclude-main --name Comentario --target internal/api --spec ./resources/swagger/swagger.yml --principal gitlab.com/comentario/comentario/internal/data.User

import (
	"embed"
	"errors"
	"github.com/go-openapi/loads"
	"github.com/jessevdk/go-flags"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/restapi"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"os"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("main")

// Variables set during build
var (
	version = "(?)"
	date    = "(?)"
)

//go:embed resources/i18n/*.yaml
var i18nFS embed.FS // Translations

func main() {
	// Init the version service
	svc.TheVersionService.Init(version, date)

	// Load the embedded Swagger file
	swaggerSpec, err := loads.Analyzed(restapi.SwaggerJSON, "")
	if err != nil {
		logger.Fatal(err)
	}

	// Create new service API
	apiInstance := operations.NewComentarioAPI(swaggerSpec)
	server := restapi.NewServer(apiInstance)
	defer util.LogError(server.Shutdown, "server.Shutdown()")

	// Configure command-line options
	if err := parseCLI(apiInstance, server, swaggerSpec.Spec().Info.Description); err != nil {
		logger.Fatalf("Failed to post-process configuration: %v", err)
	}

	// Link the translations to the embedded filesystem
	config.I18nFS = &i18nFS

	// Load and init plugins. It has to happen *before* API configuration and service initialisation, because they take
	// plugin configs into account
	if err := svc.ThePluginManager.Init(); err != nil {
		logger.Fatalf("Failed to init plugin manager: %v", err)
	}

	// Configure the API
	server.ConfigureAPI()

	// Initialise the service manager
	svc.TheServiceManager.Initialise()

	// Serve the API
	if err := server.Serve(); err != nil {
		logger.Fatalf("Serve() failed: %v", err)
	}
}

// parseCLI parses the command-line flags
func parseCLI(api *operations.ComentarioAPI, server *restapi.Server, desc string) error {
	parser := flags.NewParser(server, flags.Default)
	parser.ShortDescription = util.ApplicationName
	parser.LongDescription = desc
	server.ConfigureFlags()
	for _, optsGroup := range api.CommandLineOptionsGroups {
		_, err := parser.AddGroup(optsGroup.ShortDescription, optsGroup.LongDescription, optsGroup.Options)
		if err != nil {
			logger.Fatal(err)
		}
	}

	// Parse the command line
	if _, err := parser.Parse(); err != nil {
		code := 1
		var fe *flags.Error
		if errors.As(err, &fe) {
			if errors.Is(fe.Type, flags.ErrHelp) {
				code = 0
			}
		}
		os.Exit(code)
	}

	// Configure logging
	setupLogging()

	// Post-process the config
	return config.PostProcess()
}

// setupLogging set the correct logging level and format
func setupLogging() {
	// Create a custom backend to get rid of the default date/time format configured in the default backend
	backend := logging.NewLogBackend(os.Stdout, "", 0)
	formatter := logging.MustStringFormatter(
		util.If(
			config.ServerConfig.NoLogColours,
			`%{time:2006-01-02 15:04:05.000} %{level:-5.5s} %{module:-11.11s} | %{message}`,
			`%{color}%{time:2006-01-02 15:04:05.000} %{color:bold}%{level:-5.5s}%{color:reset} %{color}%{module:-11.11s} | %{message}%{color:reset}`))
	logging.SetBackend(logging.NewBackendFormatter(backend, formatter))

	// Configure logging level
	var logLevel logging.Level
	switch len(config.ServerConfig.Verbose) {
	case 0:
		logLevel = logging.WARNING
	case 1:
		logLevel = logging.INFO
	default:
		logLevel = logging.DEBUG
	}
	logging.SetLevel(logLevel, "")
}
