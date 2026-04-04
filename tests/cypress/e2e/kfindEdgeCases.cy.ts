import {
    createPageViaGraphql,
    createTestToken,
    openSearchModal,
    searchInModal,
    SITE_KEY
} from './kfindProviders.helpers';

describe('kFind edge cases and shortcuts', () => {
    const token = createTestToken();
    const pageTitle = `kfind edge title ${token}`;

    before('Seed content', () => {
        cy.login();
        createPageViaGraphql(SITE_KEY, `kfind-edge-page-${token}`, pageTitle);
    });

    beforeEach(() => {
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('shows global no-results state for an unknown query', () => {
        searchInModal('kfind-edge-no-match-xyz');

        cy.get('[data-kfind-panel="true"]').contains('No results', {timeout: 2000});
    });

    it('keeps the modal responsive for special-character queries', () => {
        const specialQuery = '"/sites/test?x=1&y=2"';
        searchInModal(specialQuery);

        cy.get('[data-kfind-panel="true"]', {timeout: 2000}).should('be.visible');
        cy.get('@searchInput').should('have.value', specialQuery);
    });

    it('matches page results with case-insensitive query', () => {
        searchInModal(pageTitle.toUpperCase());

        cy.get('[data-kfind-panel="true"]').contains('Pages', {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(pageTitle, {timeout: 2000});
    });

    it('closes the modal when pressing Escape', () => {
        openSearchModal();

        cy.get('body').type('{esc}');
        cy.get('[data-kfind-panel="true"]').should('not.exist');
    });

    it('toggles modal visibility with Ctrl+K', () => {
        openSearchModal();

        cy.get('body').type('{ctrl}k');
        cy.get('[data-kfind-panel="true"]').should('not.exist');

        cy.get('body').type('{ctrl}k');
        cy.get('[data-kfind-panel="true"]', {timeout: 2000}).should('be.visible');
    });
});
