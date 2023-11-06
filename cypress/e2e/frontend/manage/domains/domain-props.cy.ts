import { DOMAINS, PATHS, REGEXES, USERS, Util } from '../../../../support/cy-utils';

context('Domain Properties page', () => {

    beforeEach(cy.backendReset);

    const localhostPagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).props;

    const checkNoInstallSection = () => {
        cy.contains('h2', 'Installation').should('not.exist');
        cy.get('#install-snippet').should('not.exist');
    };
    const checkNoEditButtons = () => {
        cy.contains('app-domain-detail a', 'Edit settings').should('not.exist');
        cy.contains('app-domain-detail a', 'SSO secret')   .should('not.exist');
    };
    const checkEditButtons = () => {
        // Click on "Edit settings" and land on the edit page
        cy.contains('app-domain-detail a', 'Edit settings').click();
        cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).edit);

        // Click on Cancel and go back
        cy.contains('app-domain-edit form a', 'Cancel').click();
        cy.isAt(localhostPagePath);

        // Click on "SSO secret" and land on the SSO secret page
        cy.contains('app-domain-detail a', 'SSO secret').click();
        cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).sso);
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

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(localhostPagePath, USERS.commenterTwo));

    it('shows properties for readonly user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.spirit.id).props);
        checkNoInstallSection();
        checkNoEditButtons();
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                 DOMAINS.spirit.host],
            ['Read-only',            ''],
            ['Default comment sort', 'Oldest first'],
            ['Authentication',       ['Anonymous comments', 'Local (password-based)']],
        ]);
    });

    it('shows properties for commenter user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.market.id).props);
        checkNoInstallSection();
        checkNoEditButtons();
        cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
            ['Host',                 DOMAINS.market.host],
            ['Read-only',            '✔'],
            ['Default comment sort', 'Most upvoted first'],
            ['Authentication',       'Local (password-based)'],
        ]);
    });

    it('shows properties for moderator user', () => {
        cy.loginViaApi(USERS.king, localhostPagePath);
        checkNoInstallSection();
        checkNoEditButtons();
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

    it('shows properties for owner user', () => {
        cy.loginViaApi(USERS.ace, localhostPagePath, Util.stubWriteText);

        // Check the Installation section
        const html = Util.installSnippet();
        cy.contains('h2', 'Installation').should('be.visible');
        cy.get('#install-snippet pre').should('have.text', html);

        // Test copying the snippet to the clipboard
        cy.contains('#install-snippet button', 'Copy').click();
        cy.get('@writeText').should('be.calledWithExactly', html);

        // Check domain properties table
        checkAllProperties();

        // Check buttons
        checkEditButtons();
    });

    it('shows properties for superuser', () => {
        cy.loginViaApi(USERS.root, localhostPagePath);
        checkNoInstallSection();
        checkAllProperties();
        checkEditButtons();
    });
});
