import {closeSearchModal, createMediaViaGraphql, searchInModal, SITE_KEY} from './kfindProviders.helpers';

describe('kFind media provider', () => {
    const token = Date.now().toString();
    const exactFile = `kfind-media-exact-${token}.txt`;
    const broaderFile = `kfind-media-broader-${token}.txt`;

    before('Seed media content via GraphQL', () => {
        cy.login();
        createMediaViaGraphql(SITE_KEY, exactFile);
        createMediaViaGraphql(SITE_KEY, broaderFile);
    });

    beforeEach(() => {
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/pages`);
        cy.get('body', {timeout: 30000}).should('be.visible');
    });

    afterEach(() => {
        closeSearchModal();
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
