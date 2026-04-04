import {createMediaViaGraphql, createTestToken, searchInModal, SITE_KEY} from './kfindProviders.helpers';

describe('kFind media provider', () => {
    const token = createTestToken();
    const exactFile = `kfind-media-exact-${token}.txt`;
    const broaderFile = `kfind-media-broader-${token}.txt`;

    before('Seed media content via GraphQL', () => {
        cy.login();
        createMediaViaGraphql(SITE_KEY, exactFile);
        createMediaViaGraphql(SITE_KEY, broaderFile);
    });

    beforeEach(() => {
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('finds a media node created via GraphQL', () => {
        searchInModal(exactFile);

        cy.get('[data-kfind-panel="true"]').contains('Media', {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(exactFile, {timeout: 2000});
    });

    it('filters media results by query term', () => {
        searchInModal(`exact-${token}`);

        cy.get('[data-kfind-panel="true"]').contains(exactFile, {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').should('not.contain', broaderFile);
    });
});
