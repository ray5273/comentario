import { DYN_CONFIG_ITEMS, PATHS, USERS } from '../../../../support/cy-utils';

context('Domain Manager', () => {

    const makeDMAliases = () => {
        cy.get('app-domain-manager')                             .as('domainManager');
        cy.get('@domainManager').contains('button', 'New domain').as('newDomain');
        cy.get('@domainManager').find('#sortByDropdown')         .as('sortDropdown');
        cy.get('@domainManager').find('#filterString')           .as('filterString');
    };

    beforeEach(cy.backendReset);

    it('redirects user to login and back to Domain Manager', () => {
        cy.visit(PATHS.manage.domains._);
        cy.isAt(PATHS.auth.login);
        cy.login(USERS.commenterOne, {goTo: false, redirectPath: PATHS.manage.domains});
    });

    it('stays on the page after reload', () => {
        cy.loginViaApi(USERS.commenterOne, PATHS.manage.domains._);
        cy.reload();
        cy.isAt(PATHS.manage.domains);
    });

    it('user without domains', () => {
        // Login with default config (no new owners allowed)
        cy.loginViaApi(USERS.commenterOne, PATHS.manage.domains._);
        cy.contains('app-domain-manager', 'You have no connected domains.');
        cy.contains('app-domain-manager button', 'New domain').should('not.exist');

        // Enable new owners and reload
        cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.operationNewOwnerEnabled, 'true');
        cy.reload();

        // Controls are visible
        makeDMAliases();
        cy.get('@domainManager').contains('You have no connected domains.');
        cy.get('@newDomain').click();
        cy.isAt(PATHS.manage.domains.create);

        // TODO
    });
});
