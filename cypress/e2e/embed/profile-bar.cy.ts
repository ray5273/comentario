import { DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Profile bar', () => {

    beforeEach(cy.backendReset);

    context('Login button', () => {

        it('triggers SSO auth when only interactive SSO is enabled', () => {
            cy.backendPatchDomain(DOMAINS.localhost.id, {authLocal: false, authAnonymous: false, ssoNonInteractive: false});
            cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Click on Login and get immediately logged-in
            cy.get('@profileBar').contains('button', 'Login').click();
            cy.testSiteIsLoggedIn(USERS.johnDoeSso.name);
        });

        [
            {name: 'only non-interactive SSO is enabled', props: {authLocal: false, authAnonymous: false}},
            {name: 'only anonymous is enabled',           props: {authLocal: false, authSso: false}},
            {name: 'no auth is enabled',                  props: {authLocal: false, authAnonymous: false, authSso: false}},
        ]
            .forEach(test =>
                it(`'isn't available when ${test.name}`, () => {
                    // Update domain auth props
                    cy.backendPatchDomain(DOMAINS.localhost.id, test.props);
                    // Disable all federated providers
                    cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);
                    // Visit and check the test site
                    cy.testSiteVisit(TEST_PATHS.comments);
                    EmbedUtils.makeAliases({anonymous: true, login: false});
                }));
    });

    it('logs user out', () => {
        cy.testSiteLoginViaApi(USERS.ace, TEST_PATHS.comments);
        cy.testSiteLogout();

        // Verify there's a Login button again
        EmbedUtils.makeAliases({anonymous: true});
    });
});
