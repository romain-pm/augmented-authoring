import {enableModule, createSite, deleteSite} from '@jahia/cypress';

describe('kFind modal', () => {
    const SITE_KEY = 'kfind-test-site';

    before('Create test site and enable kfind', () => {
        createSite(SITE_KEY, {locale: 'en', serverName: 'localhost', templateSet: 'dx-base-demo-templates'});
        enableModule('kfind', SITE_KEY);
    });

    after('Delete test site', () => {
        deleteSite(SITE_KEY);
    });

    it('should open the kFind modal with Ctrl+K and display the search input', () => {
        cy.login();
        // Navigate to jContent for the test site
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/pages`);

        // Wait for jContent to fully load
        cy.get('body', {timeout: 30000}).should('be.visible');

        // Trigger kFind modal via keyboard shortcut (Ctrl+K)
        cy.get('body').type('{ctrl}k');

        // The kFind modal should be visible — it uses Moonstone's Modal component
        // with the CSS class "search-modal"
        cy.get('.search-modal', {timeout: 10000}).should('be.visible');

        // The modal should contain a search input field
        cy.get('.search-modal input[type="text"]').should('be.visible');

        // The modal footer should contain the keyboard hint text
        cy.get('.search-modal').contains('Esc to close');

        // Close the modal with Escape
        cy.get('body').type('{esc}');
        cy.get('.search-modal').should('not.exist');
    });
});
