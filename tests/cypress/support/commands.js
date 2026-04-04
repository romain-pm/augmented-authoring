// ***********************************************
// Custom commands for kfind Cypress tests
// ***********************************************

import 'cypress-wait-until';

Cypress.Commands.add('visitJContentPage', (siteKey, language = 'en', app = 'pages') => {
    cy.login();
    cy.visit(`/jahia/jcontent/${siteKey}/${language}/${app}`);
    cy.get('body', {timeout: 30000}).should('be.visible');
});

Cypress.Commands.add('closeKfindModalIfOpen', () => {
    cy.get('body').type('{esc}');
    cy.get('body').then($body => {
        if ($body.find('[data-kfind-panel="true"]').length === 0) {
            return;
        }

        cy.get('[data-kfind-panel="true"]').should('not.be.visible');
    });
});
