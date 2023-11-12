import { DOMAINS, PATHS, REGEXES, USERS, Util } from '../../../../support/cy-utils';

context('Domain Properties page', () => {

    const localhostPagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).props;

    const makeAliases = (host: string, installSection: boolean, buttons: boolean, sso: boolean) => {
        cy.get('app-domain-properties').as('domainProps');

        // Heading
        cy.contains('h1', 'Domain').should('be.visible');
        cy.get('@domainProps').find('header app-domain-badge').should('have.text', host);

        // Install section
        if (installSection) {
            cy.get('@domainProps').contains('h2', 'Installation').should('be.visible').and('have.text', 'Installation');
            cy.get('@domainProps').find('#install-snippet').as('installSnippet').should('be.visible');
        } else {
            cy.get('@domainProps').contains('h2', 'Installation').should('not.exist');
            cy.get('@domainProps').find('#install-snippet').should('not.exist');
        }

        // Buttons
        if (buttons) {
            cy.get('@domainProps').contains('a', 'Edit settings').as('btnEditSettings').should('be.visible').and('not.have.class', 'disabled');
            cy.get('@domainProps').contains('a', 'SSO secret')   .as('btnSSOSecret')   .should('be.visible').and(sso ? 'not.have.class' : 'have.class', 'disabled');
        }
    };

    const checkEditButtons = (domainId: string, sso: boolean) => {
        // Click on "Edit settings" and land on the edit page
        cy.contains('app-domain-detail a', 'Edit settings').click();
        cy.isAt(PATHS.manage.domains.id(domainId).edit);

        // Click on Cancel and go back
        cy.contains('app-domain-edit form a', 'Cancel').click();
        cy.isAt(PATHS.manage.domains.id(domainId).props);

        if (sso) {
            // Click on "SSO secret" and land on the SSO secret page
            cy.contains('app-domain-detail a', 'SSO secret').click();
            cy.isAt(PATHS.manage.domains.id(domainId).sso);
        }
    };

    const checkAllProperties = () => {
        cy.contains('h2', 'Properties').should('be.visible');
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                                      DOMAINS.localhost.host],
            ['Name',                                      DOMAINS.localhost.name],
            ['Read-only',                                 ''],
            ['Default comment sort',                      'Oldest first'],
            [
                'Authentication',
                [
                    'Anonymous comments',
                    'Local (password-based)',
                    'Non-interactive Single Sign-On',
                    `via http://localhost:8080/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                    'Facebook',
                    'GitHub',
                    'GitLab',
                    'Google',
                    'Twitter',
                ],
            ],
            ['Require moderator approval on comment, if', 'Author is anonymous'],
            ['Email moderators',                          'For comments pending moderation'],
            ['Created',                                  REGEXES.datetime],
            ['Number of comments',                       '16'],
            ['Number of views',                          '5'],
        ]);
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,         dest: 'back'},
            {name: 'owner',      user: USERS.ace,          dest: 'back'},
            {name: 'moderator',  user: USERS.king,         dest: 'back'},
            {name: 'commenter',  user: USERS.commenterTwo, dest: 'back'},
            {name: 'non-domain', user: USERS.commenterOne, dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(localhostPagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(localhostPagePath, USERS.commenterTwo));

    it('shows properties for readonly user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.spirit.id).props);
        makeAliases(DOMAINS.spirit.host, false, false, false);
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                 DOMAINS.spirit.host],
            ['Read-only',            ''],
            ['Default comment sort', 'Oldest first'],
            ['Authentication',       ['Anonymous comments', 'Local (password-based)']],
        ]);
    });

    it('shows properties for commenter user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.market.id).props);
        makeAliases(DOMAINS.market.host, false, false, false);
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                 DOMAINS.market.host],
            ['Read-only',            '✔'],
            ['Default comment sort', 'Most upvoted first'],
            ['Authentication',       'Local (password-based)'],
        ]);
    });

    it('shows properties for moderator user', () => {
        cy.loginViaApi(USERS.king, localhostPagePath);
        makeAliases(DOMAINS.localhost.host, false, false, false);
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                 DOMAINS.localhost.host],
            ['Read-only',            ''],
            ['Default comment sort', 'Oldest first'],
            [
                'Authentication',
                [
                    'Anonymous comments',
                    'Local (password-based)',
                    'Non-interactive Single Sign-On',
                    `via http://localhost:8080/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                    'Facebook',
                    'GitHub',
                    'GitLab',
                    'Google',
                    'Twitter',
                ],
            ],
        ]);
    });

    context('for owner user', () => {

        it('shows properties for SSO-enabled domain', () => {
            cy.loginViaApi(USERS.ace, localhostPagePath, Util.stubWriteText);
            makeAliases(DOMAINS.localhost.host, true, true, true);

            // Check the Installation section
            const html = Util.installSnippet();
            cy.get('@installSnippet').find('pre').should('have.text', html);

            // Test copying the snippet to the clipboard
            cy.get('@installSnippet').contains('button', 'Copy').click();
            cy.get('@writeText').should('be.calledWithExactly', html);

            // Check domain properties table
            checkAllProperties();

            // Check buttons
            checkEditButtons(DOMAINS.localhost.id, true);
        });

        it('shows properties for non-SSO-enabled domain', () => {
            cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.factor.id).props);
            makeAliases(DOMAINS.factor.host, true, true, false);
            checkEditButtons(DOMAINS.factor.id, false);
        });
    });

    it('shows properties for superuser', () => {
        cy.loginViaApi(USERS.root, localhostPagePath);
        makeAliases(DOMAINS.localhost.host, false, true, true);
        checkAllProperties();
        checkEditButtons(DOMAINS.localhost.id, true);
    });
});
