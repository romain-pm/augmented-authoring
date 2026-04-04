import {closeSearchModal, searchInModal, SITE_KEY} from './kfindProviders.helpers';

describe('kFind features provider', () => {
    beforeEach(() => {
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/pages`);
        cy.get('body', {timeout: 30000}).should('be.visible');
    });

    afterEach(() => {
        closeSearchModal();
    });

    it('returns feature results for page models query', () => {
        searchInModal('page models');

        cy.get('[data-kfind-panel="true"]').contains('Features', {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(/page\s*models/i, {timeout: 2000});
    });

    it('does not return feature results for unknown query', () => {
        searchInModal('kfind-feature-no-match-xyz');

        cy.get('[data-kfind-empty-state="no-results"]', {timeout: 2000}).should('be.visible');
        cy.get('[data-kfind-panel="true"]').should('not.contain', 'Features');
    });
});
