import { DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

// eslint-disable-next-line no-only-or-skip-tests/no-skip-tests
const itHeaded = Cypress.browser.isHeaded ? it : it.skip;

context('Profile bar', () => {

    beforeEach(cy.backendReset);

    context('Login button', () => {

        // Because of the login popup, this only works with a "headed" browser
        itHeaded('triggers SSO auth when only interactive SSO is enabled', () => {
            cy.backendPatchDomain(DOMAINS.localhost.id, {
                authLocal: false,
                authAnonymous: false,
                ssoNonInteractive: false
            });
            cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Click on Login and get immediately logged-in
            cy.get('@profileBar').contains('button', 'Login').click();
            cy.testSiteIsLoggedIn(USERS.johnDoeSso.name);
        });

        [
            {
                name:     'only non-interactive SSO is enabled',
                readonly: false,
                notice:   undefined,
                props:    {authLocal: false, authAnonymous: false}},
            {
                name:     'only anonymous is enabled',
                readonly: false,
                notice:   undefined,
                props:    {authLocal: false, authSso: false}},
            {
                name:     'no auth is enabled',
                readonly: true,
                notice:   'This domain has no authentication method available. You cannot add new comments.',
                props:    {authLocal: false, authAnonymous: false, authSso: false}},
        ]
            .forEach(test =>
                it(`isn't available when ${test.name}`, () => {
                    // Update domain auth props
                    cy.backendPatchDomain(DOMAINS.localhost.id, test.props);
                    // Disable all federated providers
                    cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);
                    // Visit and check the test site
                    cy.testSiteVisit(TEST_PATHS.comments);
                    EmbedUtils.makeAliases({anonymous: true, login: false, readonly: test.readonly, notice: test.notice});
                }));
    });

    it('logs user out', () => {
        cy.testSiteLoginViaApi(USERS.ace, TEST_PATHS.comments);
        cy.testSiteLogout();

        // Verify there's a Login button again
        EmbedUtils.makeAliases({anonymous: true});
    });
});
