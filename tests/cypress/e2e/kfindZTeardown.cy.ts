import {deleteSite} from '@jahia/cypress';
import {SITE_KEY} from './kfindProviders.helpers';

describe('kFind test suite teardown', () => {
    it('deletes the shared test site', () => {
        if (Cypress.env('KFIND_KEEP_SITE') === true) {
            cy.log('Skipping site deletion because KFIND_KEEP_SITE=true');
            return;
        }

        deleteSite(SITE_KEY);
    });
});
