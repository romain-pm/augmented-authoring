import {createPageViaGraphql, createTestToken, searchInModal, SITE_KEY} from './kfindProviders.helpers';

describe('kFind pages provider', () => {
    const token = createTestToken();
    const exactTitle = `kfind pages exact ${token}`;
    const broaderTitle = `kfind pages broader ${token}`;

    before('Seed page content via GraphQL', () => {
        cy.login();
        createPageViaGraphql(SITE_KEY, `kfind-pages-exact-${token}`, exactTitle);
        createPageViaGraphql(SITE_KEY, `kfind-pages-broader-${token}`, broaderTitle);
    });

    beforeEach(() => {
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('finds a page created via GraphQL', () => {
        searchInModal(exactTitle);

        cy.get('[data-kfind-panel="true"]').contains('Pages', {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(exactTitle, {timeout: 2000});
    });

    it('filters page results by query term', () => {
        searchInModal(`exact ${token}`);

        cy.get('[data-kfind-panel="true"]').contains(exactTitle, {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').should('not.contain', broaderTitle);
    });
});
