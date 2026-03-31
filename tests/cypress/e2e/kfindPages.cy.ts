import {enableModule, createSite, deleteSite} from '@jahia/cypress';
import {
    closeSearchModal,
    createPageViaGraphql,
    searchInModal
} from './kfindProviders.helpers';

describe('kFind pages provider', () => {
    const SITE_KEY = 'kfind-pages-site';
    const token = Date.now().toString();
    const exactTitle = `kfind pages exact ${token}`;
    const broaderTitle = `kfind pages broader ${token}`;

    before('Create test site, enable module and seed page content via GraphQL', () => {
        createSite(SITE_KEY, {locale: 'en', serverName: 'localhost', templateSet: 'dx-base-demo-templates'});
        enableModule('kfind', SITE_KEY);

        cy.login();
        createPageViaGraphql(SITE_KEY, `kfind-pages-exact-${token}`, exactTitle);
        createPageViaGraphql(SITE_KEY, `kfind-pages-broader-${token}`, broaderTitle);
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

    it('finds a page created via GraphQL', () => {
        searchInModal(exactTitle);

        cy.get('.search-modal').contains('Pages', {timeout: 10000});
        cy.get('.search-modal').contains(exactTitle, {timeout: 20000});
    });

    it('filters page results by query term', () => {
        searchInModal(`exact ${token}`);

        cy.get('.search-modal').contains(exactTitle, {timeout: 20000});
        cy.get('.search-modal').should('not.contain', broaderTitle);
    });
});
