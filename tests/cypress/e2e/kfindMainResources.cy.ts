import {createMainResourceViaGraphql, createTestToken, searchInModal, SITE_KEY} from './kfindProviders.helpers';

describe('kFind main resources provider', () => {
    const token = createTestToken();
    const exactTitle = `kfind main resource exact ${token}`;
    const broaderTitle = `kfind main resource broader ${token}`;

    before('Seed main resources via GraphQL', () => {
        cy.login();

        createMainResourceViaGraphql(SITE_KEY, `kfind-main-resource-exact-${token}`, exactTitle);
        createMainResourceViaGraphql(SITE_KEY, `kfind-main-resource-broader-${token}`, broaderTitle);

        cy.wrap([...Array(8).keys()]).each(index => {
            createMainResourceViaGraphql(
                SITE_KEY,
                `kfind-main-resource-bulk-${token}-${index}`,
                `kfind main resource bulk ${token} item ${index}`
            );
        });
    });

    beforeEach(() => {
        cy.visitJContentPage(SITE_KEY);
    });

    afterEach(() => {
        cy.closeKfindModalIfOpen();
    });

    it('finds a main resource created via GraphQL', () => {
        searchInModal(exactTitle);

        cy.get('[data-kfind-panel="true"]').contains(/Main Resource/i, {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(exactTitle, {timeout: 2000});
    });

    it('filters main resource results by query term', () => {
        searchInModal(`exact ${token}`);

        cy.get('[data-kfind-panel="true"]').contains(/Main Resource/i, {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').contains(exactTitle, {timeout: 2000});
        cy.get('[data-kfind-panel="true"]').should('not.contain', broaderTitle);
    });

    it('shows more main resource results after clicking Show more', () => {
        searchInModal(`kfind main resource bulk ${token}`);

        cy.get('[data-kfind-panel="true"]').contains(/Main Resource/i, {timeout: 2000});
        cy.get('[data-kfind-result-row="true"][tabindex]', {timeout: 2000})
            .its('length')
            .then(initialCount => {
                const countBefore = Number(initialCount);
                expect(countBefore).to.be.greaterThan(0);

                cy.get('[data-kfind-show-more="true"]', {timeout: 2000}).first().click();

                cy.get('[data-kfind-result-row="true"][tabindex]', {timeout: 2000})
                    .its('length')
                    .should('be.greaterThan', countBefore);
            });
    });
});
