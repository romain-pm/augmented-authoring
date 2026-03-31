import {enableModule, createSite, deleteSite} from '@jahia/cypress';
import {closeSearchModal, searchInModal} from './kfindProviders.helpers';

describe('kFind features provider', () => {
    const SITE_KEY = 'kfind-features-site';

    before('Create test site and enable kfind', () => {
        createSite(SITE_KEY, {locale: 'en', serverName: 'localhost', templateSet: 'dx-base-demo-templates'});
        enableModule('kfind', SITE_KEY);
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

    it('returns feature results for page models query', () => {
        searchInModal('page models');

        cy.get('.search-modal').contains('Features', {timeout: 10000});
        cy.get('.search-modal').contains(/page\s*models/i, {timeout: 10000});
    });

    it('does not return feature results for unknown query', () => {
        searchInModal('kfind-feature-no-match-xyz');

        cy.get('.search-modal').contains('No results found', {timeout: 10000});
        cy.get('.search-modal').should('not.contain', 'Features');
    });
});
