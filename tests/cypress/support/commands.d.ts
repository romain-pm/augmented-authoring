declare global {
    namespace Cypress {
        interface Chainable {
            visitJContentPage(siteKey: string, language?: string, app?: string): Chainable<void>;
            closeKfindModalIfOpen(): Chainable<void>;
        }
    }
}

export {};
