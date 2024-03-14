import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        // Backend's (API and the admin app) base URL
        baseUrl: 'http://localhost:8080',
        numTestsKeptInMemory: 2,

        // Occasionally tests fail for no conceivable reason (most likely due to Cypress/browser quirks). Therefore we
        // want to retry at least once
        retries: {
            runMode: 1,
        },
    },
});
