import {closeSearchModal, createPageViaGraphql, searchInModal, SITE_KEY} from './kfindProviders.helpers';

const RESULT_ROW_SELECTOR = '[data-kfind-result-row="true"][tabindex]';
const SHOW_MORE_SELECTOR = '[data-kfind-show-more="true"]';

describe('kFind pagination behavior', () => {
    const token = Date.now().toString();

    before('Seed many pages', () => {
        cy.login();
        cy.wrap([...Array(8).keys()]).each(index => {
            createPageViaGraphql(
                SITE_KEY,
                `kfind-pagination-${token}-${index}`,
                `kfind pagination ${token} item ${index}`
            );
        });
    });

    beforeEach(() => {
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/pages`);
        cy.get('body', {timeout: 30000}).should('be.visible');
    });

    afterEach(() => {
        closeSearchModal();
    });

    it('shows a Show more button when a section has additional results', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get('[data-kfind-panel="true"]').contains('Pages', {timeout: 2000});
        cy.get(SHOW_MORE_SELECTOR, {timeout: 2000}).first().should('be.visible');
    });

    it('loads more results after clicking Show more', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000})
            .its('length')
            .then(initialCount => {
                const countBefore = Number(initialCount);
                expect(countBefore).to.be.greaterThan(0);

                cy.get(SHOW_MORE_SELECTOR, {timeout: 2000}).first().click();

                cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).its('length').should('be.greaterThan', countBefore);
            });
    });

    it('keeps focus on Show more when pressing Arrow keys', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(SHOW_MORE_SELECTOR, {timeout: 2000}).first().focus();
        cy.focused().should('match', SHOW_MORE_SELECTOR);
        cy.focused().type('{downarrow}');
        cy.focused().should('match', SHOW_MORE_SELECTOR);

        cy.get(SHOW_MORE_SELECTOR, {timeout: 2000}).first().focus();
        cy.focused().type('{uparrow}');
        cy.focused().should('match', SHOW_MORE_SELECTOR);
    });
});
