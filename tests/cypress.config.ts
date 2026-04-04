import {defineConfig} from 'cypress';

export default defineConfig({
    chromeWebSecurity: false,
    defaultCommandTimeout: 2000,
    video: true,
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
        configFile: 'reporter-config.json'
    },
    screenshotsFolder: './results/screenshots',
    videosFolder: './results/videos',
    viewportWidth: 1366,
    viewportHeight: 768,
    watchForFileChanges: false,
    e2e: {
        setupNodeEvents(on, config) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('cypress-terminal-report/src/installLogsPrinter')(on);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('./cypress/plugins/index.js')(on, config);
        },
        specPattern: [
            'cypress/e2e/kfind0Setup.cy.ts',
            'cypress/e2e/kfindEdgeCases.cy.ts',
            'cypress/e2e/kfindFeatures.cy.ts',
            'cypress/e2e/kfindMainResources.cy.ts',
            'cypress/e2e/kfindMedia.cy.ts',
            'cypress/e2e/kfindInteraction.cy.ts',
            'cypress/e2e/kfindPages.cy.ts',
            'cypress/e2e/kfindPagination.cy.ts',
            'cypress/e2e/kfindZTeardown.cy.ts'
        ],
        excludeSpecPattern: '*.ignore.ts',
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:8080'
    }
});
