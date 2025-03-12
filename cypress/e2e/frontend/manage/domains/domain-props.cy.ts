import { DomainConfigKey, DOMAINS, PATHS, REGEXES, UI_LANGUAGES, USERS, Util } from '../../../../support/cy-utils';

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

    const checkAllProperties = (user: Cypress.User) => {
        cy.contains('h2', 'Properties').should('be.visible');
        cy.get('@domainProps').find('#domainDetailTable').dlTexts().should('matrixMatch', [
            ['Host',                                                    DOMAINS.localhost.host],
            ['Name',                                                    DOMAINS.localhost.name],
            ['Read-only',                                               ''],
            ['Default comment sort',                                    'Oldest first'],
            ['Authentication'],
                ['Show login dialog for unauthenticated users',         '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
            ['Comments'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Enable comment RSS feeds',                            '✔'],
                ['Show deleted comments',                               '✔'],
                ['Maximum comment text length',                         '4,096'],
            ['Markdown'],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
            ['Authentication methods',
                [
                    'Commenting without registration',
                    'Local (password-based)',
                    'Facebook',
                    'GitHub',
                    'GitLab',
                    'Google',
                    'Twitter',
                    'Non-interactive Single Sign-On',
                        `via ${baseUrl}/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                ],
            ],
            ['Require moderator approval on comment, if', 'Author is unregistered'],
            ['Email moderators',                          'For comments pending moderation'],
            ['Created',                                   REGEXES.datetime],
            ['Number of comments',                        '16'],
            ['Number of views',                           '5'],
            ['Comment RSS feed',                          null], // Checked separately below
        ]);

        // Verify the RSS link
        cy.get('@domainProps').ddItem('Comment RSS feed').verifyRssLink(DOMAINS.localhost.id, user.id);
    };

    const checkNoAttributes = () => cy.get('@domainProps').find('app-attribute-table').should('not.exist');

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
        cy.get('#domainDetailTable').dlTexts().should('matrixMatch', [
            ['Host',                                                    DOMAINS.spirit.host],
            ['Read-only',                                               ''],
            ['Default comment sort',                                    'Oldest first'],
            ['Authentication'],
                ['Show login dialog for unauthenticated users',         '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
            ['Comments'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Enable comment RSS feeds',                            '✔'],
                ['Show deleted comments',                               '✔'],
                ['Maximum comment text length',                         '1,024'],
            ['Markdown'],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
            ['Authentication methods',                                  ['Commenting without registration', 'Local (password-based)']],
            ['Comment RSS feed',                                        null],
        ]);
        checkNoAttributes();
    });

    it('shows properties for commenter user', () => {
        cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.market.id).props);
        makeAliases(DOMAINS.market.host, false, false, false);
        cy.get('#domainDetailTable').dlTexts().should('matrixMatch', [
            ['Host',                                                    DOMAINS.market.host],
            ['Read-only',                                               '✔'],
            ['Default comment sort',                                    'Most upvoted first'],
            ['Authentication'],
                ['Show login dialog for unauthenticated users',         '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
            ['Comments'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Enable comment RSS feeds',                            '✔'],
                ['Show deleted comments',                               '✔'],
                ['Maximum comment text length',                         '1,024'],
            ['Markdown'],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
            ['Authentication methods',                                  'Local (password-based)'],
            ['Comment RSS feed',                                        null], // Checked separately below
        ]);
        checkNoAttributes();

        // Verify the RSS link
        cy.get('@domainProps').ddItem('Comment RSS feed').verifyRssLink(DOMAINS.market.id, USERS.king.id);
    });

    it('shows properties for moderator user', () => {
        cy.loginViaApi(USERS.king, localhostPagePath);
        makeAliases(DOMAINS.localhost.host, false, false, false);
        cy.get('#domainDetailTable').dlTexts().should('matrixMatch', [
            ['Host',                                                    DOMAINS.localhost.host],
            ['Read-only',                                               ''],
            ['Default comment sort',                                    'Oldest first'],
            ['Authentication'],
                ['Show login dialog for unauthenticated users',         '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
            ['Comments'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Enable comment RSS feeds',                            '✔'],
                ['Show deleted comments',                               '✔'],
                ['Maximum comment text length',                         '4,096'],
            ['Markdown'],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
            ['Authentication methods',
                [
                    'Commenting without registration',
                    'Local (password-based)',
                    'Facebook',
                    'GitHub',
                    'GitLab',
                    'Google',
                    'Twitter',
                    'Non-interactive Single Sign-On',
                        `via ${baseUrl}/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`,
                ],
            ],
            ['Comment RSS feed',                                        null], // Checked separately below
        ]);
        checkNoAttributes();


        // Verify the RSS link
        cy.get('@domainProps').ddItem('Comment RSS feed').verifyRssLink(DOMAINS.localhost.id, USERS.king.id);
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
            cy.get('#opt-auto-init')               .as('optAutoInit')             .should('be.visible').and('be.checked');
            cy.get('#opt-auto-non-interactive-sso').as('optAutoNonInteractiveSso').should('be.visible').and('not.be.checked');
            cy.get('#opt-live-update')             .as('optLiveUpdate')           .should('be.visible').and('be.checked');
            cy.get('#opt-no-fonts')                .as('optNoFonts')              .should('be.visible').and('not.be.checked');
            cy.get('#opt-no-css')                  .as('optNoCss')                .should('be.visible').and('not.be.checked');
            cy.get('#opt-lang')                    .as('optLang')                 .should('be.visible').and('have.value', '').and('be.enabled');
            cy.get('#opt-css-override')            .as('optCssOverride')          .should('be.visible').and('have.value', '').and('be.enabled');
            cy.get('#opt-max-level')               .as('optMaxLevel')             .should('be.visible').and('have.value', '10');
            cy.get('#opt-page-id')                 .as('optPageId')               .should('be.visible').and('have.value', '');
            cy.get('#opt-theme')                   .as('optTheme')                .should('be.visible').and('have.value', '');

            // Change options
            // -- auto-init
            cy.get('@optAutoInit').clickLabel().should('not.be.checked');
            checkSnippet(' auto-init="false"');
            cy.get('@optAutoInit').clickLabel();
            checkSnippet('');
            // -- auto-non-interactive-sso
            cy.get('@optAutoNonInteractiveSso').clickLabel().should('be.checked');
            checkSnippet(' auto-non-interactive-sso="true"');
            cy.get('@optAutoNonInteractiveSso').clickLabel();
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
            cy.get('@optLang').texts('option').should('arrayMatch', ['(default)', ...Object.values(UI_LANGUAGES)]);
            Object.keys(UI_LANGUAGES)
                .forEach((lang, idx) => {
                    cy.get('@optLang').select(idx+1);
                    checkSnippet(` lang="${lang}"`);
                });
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
            // -- theme
            cy.get('@optTheme').texts('option').should('arrayMatch', ['(default)', 'Light', 'Dark']);
            cy.get('@optTheme').select(1);
            checkSnippet(` theme="light"`);
            cy.get('@optTheme').select(2);
            checkSnippet(` theme="dark"`);
            cy.get('@optTheme').select(0);
            checkSnippet('');

            // Multiple options as once
            cy.get('@optAutoInit').clickLabel();
            cy.get('@optAutoNonInteractiveSso').clickLabel();
            cy.get('@optLiveUpdate').clickLabel();
            cy.get('@optNoFonts').clickLabel();
            cy.get('@optLang').select('Nederlands (Dutch)');
            cy.get('@optCssOverride').setValue('https://whatever.org/x.css');
            cy.get('@optMaxLevel').setValue('42');
            cy.get('@optPageId').setValue('/path/1');
            cy.get('@optTheme').select('Dark');
            checkSnippet(
                ' auto-init="false"' +
                ' auto-non-interactive-sso="true"' +
                ' live-update="false"' +
                ' no-fonts="true"' +
                ' lang="nl"' +
                ' css-override="https://whatever.org/x.css"' +
                ' max-level="42"' +
                ' page-id="/path/1"'+
                ' theme="dark"');
        });

        it('shows properties for SSO-enabled domain', () => {
            cy.loginViaApi(USERS.ace, localhostPagePath, Util.stubWriteText);
            makeAliases(DOMAINS.localhost.host, true, true, true);
            checkAllProperties(USERS.ace);
            checkNoAttributes();
            checkEditButtons(DOMAINS.localhost.id, true);
        });

        it('shows properties for non-SSO-enabled domain', () => {
            cy.loginViaApi(USERS.king, PATHS.manage.domains.id(DOMAINS.factor.id).props);
            makeAliases(DOMAINS.factor.host, true, true, false);
            checkNoAttributes();
            checkEditButtons(DOMAINS.factor.id, false);
        });
    });

    it('shows properties for superuser', () => {
        cy.loginViaApi(USERS.root, localhostPagePath);
        makeAliases(DOMAINS.localhost.host, false, true, true);
        checkAllProperties(USERS.root);

        // No attributes initially
        checkNoAttributes();

        // Check edit buttons
        checkEditButtons(DOMAINS.localhost.id, true);

        // Check attributes
        cy.backendUpdateDomainAttrs(DOMAINS.localhost.id, {hoho: 'xyz'});
        cy.visit(localhostPagePath);
        cy.get('@domainProps').find('app-attribute-table').as('attrs')
            .contains('button', 'Attributes').as('attrBtn');

        // Attributes are collapsed initially
        cy.get('@attrBtn').should('have.attr', 'aria-expanded', 'false');
        cy.get('@attrs').find('#attributes-container-1').should('not.be.visible');

        // Expand attributes
        cy.get('@attrBtn').click().should('have.attr', 'aria-expanded', 'true');
        cy.get('@attrs').find('#attributes-container-1').should('be.visible')
            .find('.detail-table').dlTexts()
            .should('matrixMatch', [['hoho', 'xyz']]);

        // Replace attributes and reload
        cy.backendUpdateDomainAttrs(DOMAINS.localhost.id, {hoho: '', subscriptionId: '1234567890', active: 'true'});
        cy.reload();
        cy.get('@attrBtn').click();
        cy.get('@attrs').find('#attributes-container-1').should('be.visible')
            .find('.detail-table').dlTexts()
            // Attributes must be sorted by key
            .should('matrixMatch', [
                ['active',         'true'],
                ['subscriptionId', '1234567890'],
            ]);

        // Clean all, disable RSS and reload: no attributes section anymore
        cy.backendUpdateDomainAttrs(DOMAINS.localhost.id, {subscriptionId: '', active: ''});
        cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.enableRss]: false});
        cy.reload();
        checkNoAttributes();

        // No RSS widget either
        cy.get('@domainProps').ddItem('Comment RSS feed').should('have.text', 'Disabled for this domain');
    });
});
