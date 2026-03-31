import {enableModule, createSite, deleteSite} from '@jahia/cypress';
import {
    closeSearchModal,
    createMediaViaGraphql,
    searchInModal
} from './kfindProviders.helpers';

describe('kFind media provider', () => {
    const SITE_KEY = 'kfind-media-site';
    const token = Date.now().toString();
    const exactFile = `kfind-media-exact-${token}.txt`;
    const broaderFile = `kfind-media-broader-${token}.txt`;

    before('Create test site, enable module and seed media content via GraphQL', () => {
        createSite(SITE_KEY, {locale: 'en', serverName: 'localhost', templateSet: 'dx-base-demo-templates'});
        enableModule('kfind', SITE_KEY);

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

    after('Delete test site', () => {
        deleteSite(SITE_KEY);
    });

    it('finds a media node created via GraphQL', () => {
        searchInModal(exactFile);

        cy.get('.search-modal').contains('Media', {timeout: 10000});
        cy.get('.search-modal').contains(exactFile, {timeout: 20000});
    });

    it('filters media results by query term', () => {
        searchInModal(`exact-${token}`);

        cy.get('.search-modal').contains(exactFile, {timeout: 20000});
        cy.get('.search-modal').should('not.contain', broaderFile);
    });
});
