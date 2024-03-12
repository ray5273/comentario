import { DOMAINS, PATHS, REGEXES, USERS, Util } from '../../../../support/cy-utils';

context('Domain Properties page', () => {

    const baseUrl = Cypress.config().baseUrl;
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
                    `via ${baseUrl}/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
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
                    `via ${baseUrl}/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
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

        const checkSnippet = (opts: string) => {
            const html = `<script defer src="${baseUrl}/comentario.js"></script>\n` +
                `<comentario-comments${opts}></comentario-comments>`;

            // Check the HTML
            cy.get('@installSnippet').find('pre').should('have.text', html);

            // Test copying the snippet to the clipboard
            cy.get('@installSnippet').contains('button', 'Copy').click();
            cy.get('@writeText').should('be.calledWithExactly', html);
        };

        it('shows install snippet', () => {
            cy.loginViaApi(USERS.ace, localhostPagePath, Util.stubWriteText);
            makeAliases(DOMAINS.localhost.host, true, true, true);

            // No options visible by default
            cy.get('#install-snippet-options').should('not.be.visible');

            // Check the default snippet
            checkSnippet('');

            // Expand options
            cy.get('@installSnippet').contains('button', 'Options').click();
            cy.get('#install-snippet-options').should('be.visible');

            // Check option defaults
            cy.get('#opt-auto-init')   .as('optAutoInit')   .should('be.visible').and('be.checked');
            cy.get('#opt-live-update') .as('optLiveUpdate') .should('be.visible').and('be.checked');
            cy.get('#opt-no-fonts')    .as('optNoFonts')    .should('be.visible').and('not.be.checked');
            cy.get('#opt-no-css')      .as('optNoCss')      .should('be.visible').and('not.be.checked');
            cy.get('#opt-lang')        .as('optLang')       .should('be.visible').and('have.value', '').and('be.enabled');
            cy.get('#opt-css-override').as('optCssOverride').should('be.visible').and('have.value', '').and('be.enabled');
            cy.get('#opt-max-level')   .as('optMaxLevel')   .should('be.visible').and('have.value', '10');
            cy.get('#opt-page-id')     .as('optPageId')     .should('be.visible').and('have.value', '');

            // Change options
            // -- auto-init
            cy.get('@optAutoInit').clickLabel().should('not.be.checked');
            checkSnippet(' auto-init="false"');
            cy.get('@optAutoInit').clickLabel();
            checkSnippet('');
            // -- live-update
            cy.get('@optLiveUpdate').clickLabel().should('not.be.checked');
            checkSnippet(' live-update="false"');
            cy.get('@optLiveUpdate').clickLabel();
            checkSnippet('');
            // -- no-fonts
            cy.get('@optNoFonts').clickLabel().should('be.checked');
            checkSnippet(' no-fonts="true"');
            cy.get('@optNoFonts').clickLabel();
            checkSnippet('');
            // -- no-css
            cy.get('@optNoCss').clickLabel().should('be.checked');
            cy.get('@optCssOverride').should('be.disabled');
            checkSnippet(' css-override="false"');
            cy.get('@optNoCss').clickLabel();
            cy.get('@optCssOverride').should('be.enabled');
            checkSnippet('');
            // -- lang
            cy.get('@optLang').texts('option').should('arrayMatch', [
                '(default)',
                'English (English)',
                'Nederlands (Dutch)',
                'русский (Russian)',
            ]);
            cy.get('@optLang').select(1);
            checkSnippet(' lang="en"');
            cy.get('@optLang').select(2);
            checkSnippet(' lang="nl"');
            cy.get('@optLang').select(3);
            checkSnippet(' lang="ru"');
            cy.get('@optLang').select(0);
            checkSnippet('');
            // -- css-override
            cy.get('@optCssOverride').setValue('https://example.com/test.css');
            checkSnippet(' css-override="https://example.com/test.css"');
            cy.get('@optCssOverride').clear();
            checkSnippet('');
            // -- max-level
            cy.get('@optMaxLevel').setValue('5');
            checkSnippet(' max-level="5"');
            cy.get('@optMaxLevel').setValue('10');
            checkSnippet('');
            // -- page-id
            cy.get('@optPageId').setValue('/test-page');
            checkSnippet(' page-id="/test-page"');
            cy.get('@optPageId').clear();
            checkSnippet('');

            // Multiple options as once
            cy.get('@optAutoInit').clickLabel();
            cy.get('@optLiveUpdate').clickLabel();
            cy.get('@optNoFonts').clickLabel();
            cy.get('@optLang').select('Nederlands (Dutch)');
            cy.get('@optCssOverride').setValue('https://whatever.org/x.css');
            cy.get('@optMaxLevel').setValue('42');
            cy.get('@optPageId').setValue('/path/1');
            checkSnippet(
                ' auto-init="false"' +
                ' live-update="false"' +
                ' no-fonts="true"' +
                ' lang="nl"' +
                ' css-override="https://whatever.org/x.css"' +
                ' max-level="42"' +
                ' page-id="/path/1"');
        });

        it('shows properties for SSO-enabled domain', () => {
            cy.loginViaApi(USERS.ace, localhostPagePath, Util.stubWriteText);
            makeAliases(DOMAINS.localhost.host, true, true, true);
            checkAllProperties();
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
