import { defineConfig } from 'cypress';
import * as installLogsPrinter from "cypress-terminal-report/src/installLogsPrinter";

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // Enable the cypress-terminal-report log printer
            installLogsPrinter(on, {
                printLogsToConsole: 'onFail',
                printLogsToFile:    'always',
                outputRoot:         config.projectRoot + '/cypress/reports/',
                outputTarget: {
                    'log.html': 'html',
                    'log.txt':  'txt',
                },
            });
        },

        // Backend's (API and the admin app) base URL
        baseUrl: 'http://localhost:8080',
        numTestsKeptInMemory: 2,

        // Use the legacy behaviour allowing for cross-origin tests
        injectDocumentDomain: true,

        // Occasionally, tests fail for no conceivable reason (most likely due to Cypress/browser quirks). Therefore we
        // want to retry at least once
        retries: {
            runMode: 1,
        },
    },
});
