import {
    createMediaViaGraphql,
    createPageViaGraphql,
    createTestToken,
    MEDIUM_TIMEOUT,
    RESULT_ROW_SELECTOR,
    searchInModal,
    SHOW_MORE_SELECTOR,
    SITE_KEY,
    visitKfindSiteInJContent
} from './kfindProviders.helpers';

describe('kFind pagination behavior', () => {
    const token = createTestToken();
    const providerOrderQuery = `page models order ${token}`;
    const staleNoMatchQuery = `kfind-stale-no-match-${token}`;

    before('Seed many pages', () => {
        cy.login();
        cy.wrap([...Array(8).keys()]).each(index => {
            createPageViaGraphql(
                SITE_KEY,
                `kfind-pagination-${token}-${index}`,
                `kfind pagination ${token} item ${index}`
            );
        });

        createPageViaGraphql(SITE_KEY, `kfind-provider-order-${token}`, `page models order ${token} page`);
        createMediaViaGraphql(SITE_KEY, `page-models-order-${token}.txt`);
    });

    beforeEach(() => {
        visitKfindSiteInJContent(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('shows a Show more button when a section has additional results', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get('[data-kfind-panel="true"]').contains('Pages', {timeout: MEDIUM_TIMEOUT});
        cy.get(SHOW_MORE_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().should('be.visible');
    });

    it('loads more results after clicking Show more', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT})
            .its('length')
            .then(initialCount => {
                const countBefore = Number(initialCount);
                expect(countBefore).to.be.greaterThan(0);

                cy.get(SHOW_MORE_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().click();

                cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT})
                    .its('length')
                    .should('be.greaterThan', countBefore);
            });
    });

    it('supports Tab then Enter to load more results from keyboard', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(SHOW_MORE_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().should('be.visible');
        cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT})
            .its('length')
            .then(initialCount => {
                const countBefore = Number(initialCount);
                expect(countBefore).to.be.greaterThan(0);

                cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().focus();
                for (let i = 0; i < countBefore; i += 1) {
                    cy.realPress('Tab');
                }

                cy.focused().should('match', SHOW_MORE_SELECTOR);
                cy.realPress('Enter');

                cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT})
                    .its('length')
                    .should('be.greaterThan', countBefore);
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

        cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().focus();
        cy.focused().type('e');

        cy.get('@editSpy').should('have.been.calledOnce');
    });

    it('supports Enter to navigate from a focused result row and closes the modal', () => {
        searchInModal(`kfind pagination ${token}`);

        cy.get(RESULT_ROW_SELECTOR, {timeout: MEDIUM_TIMEOUT}).first().focus();
        cy.focused().should('match', RESULT_ROW_SELECTOR);
        cy.realPress('Enter');

        cy.get('[data-kfind-modal="true"]').should('not.be.visible');
    });

    it('keeps only the latest query results when a previous request resolves late', () => {
        cy.intercept('POST', '**/modules/graphql', req => {
            const searchTerm = req.body?.variables?.searchTerm;

            if (searchTerm === `kfind pagination ${token}`) {
                req.alias = 'staleSearch';
                req.on('response', response => {
                    response.setDelay(1200);
                });
            }

            if (searchTerm === staleNoMatchQuery) {
                req.alias = 'latestSearch';
            }
        });

        searchInModal(`kfind pagination ${token}`);
        cy.get('@searchInput').clear();
        cy.get('@searchInput').type(staleNoMatchQuery);

        cy.wait('@latestSearch');
        cy.wait('@staleSearch');

        cy.get('[data-kfind-empty-state="no-results"]', {timeout: 3000}).should('be.visible');
        cy.get('[data-kfind-panel="true"]').should('not.contain', `kfind pagination ${token}`);
    });

    it('renders provider sections in priority order for a shared query', () => {
        searchInModal(providerOrderQuery);

        cy.get('[data-kfind-results-section-key]', {timeout: 4000}).should($sections => {
            const sectionKeys = Array.from($sections, section =>
                section.getAttribute('data-kfind-results-section-key')
            );

            expect(sectionKeys).to.include('kfind-features');
            expect(sectionKeys).to.include('kfind-jcr-media');
            expect(sectionKeys).to.include('kfind-jcr-pages');

            const featuresIndex = sectionKeys.indexOf('kfind-features');
            const mediaIndex = sectionKeys.indexOf('kfind-jcr-media');
            const pagesIndex = sectionKeys.indexOf('kfind-jcr-pages');

            expect(featuresIndex).to.be.lessThan(mediaIndex);
            expect(mediaIndex).to.be.lessThan(pagesIndex);
        });
    });
});
