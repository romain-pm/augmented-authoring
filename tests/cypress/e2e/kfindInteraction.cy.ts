import {createPageViaGraphql, createTestToken, searchInModal, SITE_KEY} from './kfindProviders.helpers';

const RESULT_ROW_SELECTOR = '[data-kfind-result-row="true"][tabindex]';
const SEARCH_INPUT_SELECTOR = '[data-kfind-search-input-wrapper="true"] input[type="search"]';

describe('kFind keyboard interaction', () => {
    const token = createTestToken();

    before('Seed page content', () => {
        cy.login();
        createPageViaGraphql(SITE_KEY, `kfind-nav-alpha-${token}`, `kfind nav alpha ${token}`);
        createPageViaGraphql(SITE_KEY, `kfind-nav-beta-${token}`, `kfind nav beta ${token}`);
    });

    beforeEach(() => {
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('focuses the first result row when pressing Tab from the search input', () => {
        searchInModal(`kfind nav ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).first().should('be.visible');
        cy.get('@searchInput').focus();
        cy.realPress('Tab');

        cy.focused().should('match', RESULT_ROW_SELECTOR).should('have.attr', 'data-kfind-result-index', '0');
    });

    it('moves focus to the next result row on consecutive Tab presses', () => {
        searchInModal(`kfind nav ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).its('length').should('be.gte', 2);
        cy.get('@searchInput').focus();
        cy.realPress('Tab');
        cy.focused().should('match', RESULT_ROW_SELECTOR).should('have.attr', 'data-kfind-result-index', '0');

        cy.realPress('Tab');
        cy.focused().should('match', RESULT_ROW_SELECTOR).should('have.attr', 'data-kfind-result-index', '1');
    });

    it('returns focus to the search input on Shift+Tab from the first result row', () => {
        searchInModal(`kfind nav ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: 2000}).first().should('be.visible');
        cy.get('@searchInput').focus();
        cy.realPress('Tab');
        cy.focused().should('match', RESULT_ROW_SELECTOR).should('have.attr', 'data-kfind-result-index', '0');

        cy.realPress(['Shift', 'Tab']);
        cy.focused().should('match', SEARCH_INPUT_SELECTOR);
    });
});
