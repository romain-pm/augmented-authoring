import {createPageViaGraphql, createTestToken, searchInModal, SITE_KEY} from './kfindProviders.helpers';

const RESULT_ROW_SELECTOR = '[data-kfind-result-row="true"][tabindex]';
const SHOW_MORE_SELECTOR = '[data-kfind-show-more="true"]';

describe('kFind pagination behavior', () => {
    const token = createTestToken();

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
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
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

    it('supports Tab then Enter to load more results from keyboard', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(SHOW_MORE_SELECTOR, {timeout: 2000}).first().should('be.visible');
        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000})
            .its('length')
            .then(initialCount => {
                const countBefore = Number(initialCount);
                expect(countBefore).to.be.greaterThan(0);

                cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).first().focus();
                for (let i = 0; i < countBefore; i += 1) {
                    cy.realPress('Tab');
                }

                cy.focused().should('match', SHOW_MORE_SELECTOR);
                cy.realPress('Enter');

                cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).its('length').should('be.greaterThan', countBefore);
            });
    });

    it('supports Tab then e to trigger edit action on a focused result row', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.window().then(win => {
            const parentWindow = (win as unknown as {parent?: {CE_API?: {edit?: (...args: unknown[]) => void}}}).parent;
            expect(parentWindow).to.exist;

            if (!parentWindow) {
                return;
            }

            if (!parentWindow.CE_API) {
                parentWindow.CE_API = {};
            }

            if (typeof parentWindow.CE_API.edit !== 'function') {
                parentWindow.CE_API.edit = () => undefined;
            }

            cy.spy(parentWindow.CE_API, 'edit').as('editSpy');
        });

        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).first().focus();
        cy.focused().type('e');

        cy.get('@editSpy').should('have.been.calledOnce');
    });
});
