import { DOMAINS, PATHS, REGEXES, USERS } from '../../../../support/cy-utils';

context('Domain Edit page', () => {

    const makeAliases = (edit: boolean) => {
        cy.get('app-domain-edit').as('domainEdit');
        cy.get('@domainEdit').find('h1').should('have.text', edit ? 'Edit domain' : 'Create domain');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'General')       .as('tabGeneral');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Authentication').as('tabAuth');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Moderation')    .as('tabModeration');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Extensions')    .as('tabExtensions');
        cy.get('@domainEdit').contains('.form-footer a', 'Cancel')        .as('btnCancel');
        cy.get('@domainEdit').find('.form-footer button[type=submit]')    .as('btnSubmit');
    };

    const makeGeneralAliases = () => {
        cy.get('@domainEdit').find('#scheme').as('scheme')
            .next().should('have.class', 'dropdown-menu').as('schemeMenu');
        cy.get('@domainEdit').find('#host')  .as('host');
        cy.get('@domainEdit').find('#name')  .as('name');
        // Default comment sort
        cy.get('@domainEdit').find('#sort-ta').as('sortTA');
        cy.get('@domainEdit').find('#sort-td').as('sortTD');
        cy.get('@domainEdit').find('#sort-sa').as('sortSA');
        cy.get('@domainEdit').find('#sort-sd').as('sortSD');
    };

    const makeAuthAliases = (sso: boolean) => {
        cy.get('@domainEdit').find('#auth-anonymous').as('authAnonymous');
        cy.get('@domainEdit').find('#auth-local')    .as('authLocal');
        cy.get('@domainEdit').find('#auth-facebook') .as('authFacebook');
        cy.get('@domainEdit').find('#auth-github')   .as('authGithub');
        cy.get('@domainEdit').find('#auth-gitlab')   .as('authGitlab');
        cy.get('@domainEdit').find('#auth-google')   .as('authGoogle');
        cy.get('@domainEdit').find('#auth-twitter')  .as('authTwitter');
        cy.get('@domainEdit').find('#auth-sso')      .as('authSso');
        if (sso) {
            cy.get('@domainEdit').find('#sso-url')            .as('authSsoUrl');
            cy.get('@domainEdit').find('#sso-non-interactive').as('authSsoNonInt');
        }
    };

    const makeModerationAliases = () => {
        // Moderation policy
        cy.get('@domainEdit').find('#mod-anonymous')            .as('modAnonymous');
        cy.get('@domainEdit').find('#mod-authenticated')        .as('modAuthenticated');
        cy.get('@domainEdit').find('#mod-num-comments-on')      .as('modNumCommentsOn');
        cy.get('@domainEdit').find('#mod-user-age-days-on')     .as('modUserAgeDaysOn');
        cy.get('@domainEdit').find('#mod-links')                .as('modLinks');
        cy.get('@domainEdit').find('#mod-images')               .as('modImages');
        // Notify policy
        cy.get('@domainEdit').find('#mod-notify-policy-none')   .as('modNotifyPolicyNone');
        cy.get('@domainEdit').find('#mod-notify-policy-pending').as('modNotifyPolicyPending');
        cy.get('@domainEdit').find('#mod-notify-policy-all')    .as('modNotifyPolicyAll');
    };

    const makeExtensionsAliases = () => {
        cy.get('@domainEdit').find('#extension-akismet-enabled')             .as('extAkismetEnabled');
        cy.get('@domainEdit').find('#extension-apiLayer-spamChecker-enabled').as('extApiLayerEnabled');
        cy.get('@domainEdit').find('#extension-perspective-enabled')         .as('extPerspectiveEnabled');
    };

    /** Check the activity state of all tabs. */
    const checkActiveTabs = (states: boolean[]) =>
        cy.get('@domainEdit').find('a[ngbnavlink]').hasClass('active').should('arrayMatch', states);

    /** Check the invalid state of all tabs. */
    const checkInvalidTabs = (states: boolean[]) =>
        cy.get('@domainEdit').find('a[ngbnavlink]').hasClass('is-invalid').should('arrayMatch', states);

    /** Select domain scheme using dropdown. General tab must be active and aliases created. */
    const selectScheme = (https: boolean) => {
        const scheme = https ? 'https://' : 'http://';
        cy.get('@schemeMenu').should('not.be.visible');
        cy.get('@scheme').click();
        cy.get('@schemeMenu').should('be.visible')
            .contains('button', scheme).click();
        cy.get('@schemeMenu').should('not.be.visible');
        cy.get('@scheme').should('have.text', scheme);
    };

    /** Check validations on all controls. */
    const checkValidations = (checkHost: boolean, ssoEnabled: boolean) => {
        // General
        // -- Scheme
        selectScheme(false);
        selectScheme(true);

        // -- Host. Only perform a basic validation here as it's extensively checked in a unit test
        if (checkHost) {
            cy.get('@host').isInvalid('Please enter a valid domain host.')
                .type('a').isValid()
                .setValue('x'.repeat(260)).isInvalid()
                .setValue('foo.bar');
        }

        // -- Name
        cy.get('@name').verifyTextInputValidation(0, 255, false, 'Value is too long.')
            .clear();

        // Authentication -> SSO
        cy.get('@tabAuth').click();
        makeAuthAliases(ssoEnabled);
        // Check if no SSO controls exist
        if (!ssoEnabled) {
            cy.get('@domainEdit').find('#sso-non-interactive').should('not.exist');
            cy.get('@domainEdit').find('#sso-url').should('not.exist');
            // Enable SSO, and controls appear
            cy.get('@domainEdit').find('#auth-sso').clickLabel();
        }
        cy.get('@domainEdit').find('#sso-non-interactive').should('be.visible');
        cy.get('@domainEdit').find('#sso-url')
            .verifyUrlInputValidation(true, false /* Insecure allowed in e2e test */, 'Please enter a valid URL.');
        cy.get('@domainEdit').find('#auth-sso').clickLabel();

        // Moderation
        cy.get('@tabModeration').click();
        makeModerationAliases();

        // -- Number of comments input
        cy.get('@domainEdit').find('#mod-num-comments').should('not.exist');
        cy.get('@modNumCommentsOn').clickLabel();
        cy.get('@domainEdit').find('#mod-num-comments').should('be.visible').should('have.value', '3')
            .verifyNumericInputValidation(1, 999, true, 'Please enter a valid value.');

        // -- Age in days input
        cy.get('@domainEdit').find('#mod-user-age-days').should('not.exist');
        cy.get('@modUserAgeDaysOn').clickLabel();
        cy.get('@domainEdit').find('#mod-user-age-days').should('be.visible').should('have.value', '7')
            .verifyNumericInputValidation(1, 999, true, 'Please enter a valid value.');

        // Check tab validation display. Initially all valid
        checkInvalidTabs([false, false, false, false]);

        // -- General
        cy.get('@tabGeneral').click();
        cy.get('@domainEdit').find('#name').setValue('x'.repeat(256));
        checkInvalidTabs([true, false, false, false]);

        // -- Auth
        cy.get('@tabAuth').click();
        cy.get('@domainEdit').find('#auth-sso').clickLabel();
        cy.get('@domainEdit').find('#sso-url').clear();
        checkInvalidTabs([true, true, false, false]);

        // -- Moderation
        cy.get('@tabModeration').click();
        cy.get('@domainEdit').find('#mod-user-age-days').clear();
        checkInvalidTabs([true, true, true, false]);
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('for creating new domain', () => {

        it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.manage.domains.create, USERS.ace));

        it(`redirects user to login and back`, () => cy.verifyRedirectsAfterLogin(PATHS.manage.domains.create, USERS.ace));

        context('for authenticated user', () => {

            beforeEach(() => {
                cy.loginViaApi(USERS.ace, PATHS.manage.domains.create);
                makeAliases(false);
                makeGeneralAliases(); // The General tab is already active
            });

            it('has all necessary controls', () => {
                // Check page content
                cy.get('@domainEdit').texts('li[ngbnavitem]')
                    .should('arrayMatch', ['General', 'Authentication' + '6', 'Moderation', 'Extensions']);
                cy.get('@btnCancel').should('be.visible');
                cy.get('@btnSubmit').should('be.visible').should('be.enabled').should('have.text', 'Create');

                // General
                checkActiveTabs([true, false, false, false]);
                cy.get('@scheme').should('be.visible').and('have.text', 'https://').and('be.enabled');
                cy.get('@host')  .should('be.visible').and('have.value', '').and('be.enabled');
                cy.get('@name')  .should('be.visible').and('have.value', '').and('be.enabled');
                cy.get('@sortTD').should('be.checked');

                // Authentication
                cy.get('@tabAuth').click();
                checkActiveTabs([false, true, false, false]);
                makeAuthAliases(false);
                cy.get('@authAnonymous').should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@authLocal')    .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authFacebook') .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGithub')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGitlab')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGoogle')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authTwitter')  .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authSso')      .should('be.visible').and('be.enabled').and('not.be.checked');

                // Moderation
                cy.get('@tabModeration').click();
                checkActiveTabs([false, false, true, false]);
                makeModerationAliases();
                cy.get('@modAnonymous')          .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modAuthenticated')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modNumCommentsOn')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modUserAgeDaysOn')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modLinks')              .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modImages')             .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modNotifyPolicyNone')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modNotifyPolicyPending').should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modNotifyPolicyAll')    .should('be.visible').and('be.enabled').and('not.be.checked');

                // Extensions
                cy.get('@tabExtensions').click();
                checkActiveTabs([false, false, false, true]);
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')    .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extApiLayerEnabled')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extPerspectiveEnabled').should('be.visible').and('be.enabled').and('not.be.checked');


                // Back to General
                cy.get('@tabGeneral').click();
                checkActiveTabs([true, false, false, false]);

                // Click on Cancel and return to domain list
                cy.get('@btnCancel').click();
                cy.isAt(PATHS.manage.domains);
            });

            it('validates input', () => {
                // Click on Submit to engage validation
                cy.get('@btnSubmit').click();
                checkValidations(true, false);
            });

            it('doesn\'t allow adding domain with existing host', () => {
                // Try localhost
                cy.get('@host').setValue(DOMAINS.localhost.host).type('{enter}');
                cy.toastCheckAndClose('host-already-exists');

                // Another try
                cy.get('@host').setValue(DOMAINS.charge.host);
                cy.get('@btnSubmit').click();
                cy.toastCheckAndClose('host-already-exists');
            });

            it('allows to add domain with only host', () => {
                // Intercept the HTTP request to detect the new domain's ID
                cy.intercept('POST', '/api/domains').as('postDomain');

                // Add a domain
                cy.get('@host').setValue('google.com').type('{enter}');
                cy.toastCheckAndClose('data-saved');

                // Wait for the HTTP request: we should land in the new domain properties
                cy.wait('@postDomain').then(int => {
                    const id = int.response.body.id;
                    cy.log('New domain ID', id);
                    cy.isAt(PATHS.manage.domains.id(id).props);
                });

                // Verify properties
                cy.contains('app-domain-properties header app-domain-badge', 'google.com');
                cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                    ['Host',                                                    'google.com'],
                    ['Read-only',                                               ''],
                    ['Default comment sort',                                    'Newest first'],
                    ['Authentication'],
                        ['Enable commenter registration via external provider', '✔'],
                        ['Enable local commenter registration',                 '✔'],
                        ['Enable commenter registration via SSO',               '✔'],
                    ['Comments'],
                        ['Allow comment authors to delete comments',            '✔'],
                        ['Allow moderators to delete comments',                 '✔'],
                        ['Allow comment authors to edit comments',              '✔'],
                        ['Allow moderators to edit comments',                   '✔'],
                        ['Enable voting on comments',                           '✔'],
                        ['Show deleted comments',                               '✔'],
                    ['Markdown'],
                        ['Enable images in comments',                           '✔'],
                        ['Enable links in comments',                            '✔'],
                        ['Enable tables in comments',                           '✔'],
                    ['Authentication methods',
                        [
                            'Local (password-based)',
                            'Facebook',
                            'GitHub',
                            'GitLab',
                            'Google',
                            'Twitter',
                        ],
                    ],
                    ['Require moderator approval on comment, if',
                        [
                            'Author is anonymous',
                            'Comment contains link',
                            'Comment contains image',
                        ],
                    ],
                    ['Email moderators',   'For comments pending moderation'],
                    ['Created',            REGEXES.datetime],
                    ['Number of comments', '0'],
                    ['Number of views',    '0'],
                ]);

                // Go to the domain list and verify there's a new domain
                cy.sidebarClick('Domains', PATHS.manage.domains);
                cy.texts('#domain-list .domain-host')         .should('arrayMatch', ['google.com', DOMAINS.localhost.host]);
                cy.texts('#domain-list .domain-name')         .should('arrayMatch', [DOMAINS.localhost.name]);
                cy.texts('#domain-list app-domain-user-badge').should('arrayMatch', ['Owner', 'Owner']);
            });

            it('allows to add domain with custom settings', () => {
                cy.get('@host').setValue('facebook.com:4551');
                cy.get('@name').setValue('Face Book');
                cy.get('@sortSD').clickLabel();

                // Auth
                cy.get('@tabAuth').click();
                makeAuthAliases(false);
                cy.get('@authAnonymous').clickLabel();
                cy.get('@authLocal')    .clickLabel();
                cy.get('@authFacebook') .clickLabel();
                cy.get('@authGithub')   .clickLabel();
                cy.get('@authGitlab')   .clickLabel();
                cy.get('@authGoogle')   .clickLabel();
                cy.get('@authTwitter')  .clickLabel();
                cy.get('@authSso')      .clickLabel();
                cy.get('app-domain-edit #sso-url')            .setValue('https://sso.facebook.com');
                cy.get('app-domain-edit #sso-non-interactive').clickLabel();

                // Moderation
                cy.get('@tabModeration').click();
                makeModerationAliases();
                cy.get('@modAnonymous')          .clickLabel();
                cy.get('@modAuthenticated')      .clickLabel();
                cy.get('@modNumCommentsOn')      .clickLabel();
                cy.get('@modUserAgeDaysOn')      .clickLabel();
                cy.get('@modLinks')              .clickLabel();
                cy.get('@modImages')             .clickLabel();
                cy.get('@modNotifyPolicyNone')   .clickLabel();
                cy.get('app-domain-edit #mod-num-comments') .setValue('42');
                cy.get('app-domain-edit #mod-user-age-days').setValue('47');

                // Extensions
                cy.get('@tabExtensions').click();
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')                                    .clickLabel();
                cy.get('app-domain-edit #extension-akismet-config')             .setValue('name=akismet\nfoo=bar');
                cy.get('@extApiLayerEnabled')                                   .clickLabel();
                cy.get('app-domain-edit #extension-apiLayer-spamChecker-config').setValue('name=apiLayer-spamChecker\nbaz=42');
                cy.get('@extPerspectiveEnabled')                                .clickLabel();
                cy.get('app-domain-edit #extension-perspective-config')         .setValue('name=perspective\nabc=xyz');

                // Save the new domain
                cy.get('app-domain-edit button[type=submit]').click();
                cy.toastCheckAndClose('data-saved');
                cy.isAt(PATHS.manage.domains.anyId.props);

                // Verify properties
                cy.contains('app-domain-properties header app-domain-badge', 'facebook.com:4551');
                cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                    ['Host',                                                    'facebook.com:4551'],
                    ['Name',                                                    'Face Book'],
                    ['Read-only',                                               ''],
                    ['Default comment sort',                                    'Most upvoted first'],
                    ['Authentication'],
                        ['Enable commenter registration via external provider', '✔'],
                        ['Enable local commenter registration',                 '✔'],
                        ['Enable commenter registration via SSO',               '✔'],
                    ['Comments'],
                        ['Allow comment authors to delete comments',            '✔'],
                        ['Allow moderators to delete comments',                 '✔'],
                        ['Allow comment authors to edit comments',              '✔'],
                        ['Allow moderators to edit comments',                   '✔'],
                        ['Enable voting on comments',                           '✔'],
                        ['Show deleted comments',                               '✔'],
                    ['Markdown'],
                        ['Enable images in comments',                           '✔'],
                        ['Enable links in comments',                            '✔'],
                        ['Enable tables in comments',                           '✔'],
                    ['Authentication methods',
                        [
                            'Anonymous comments',
                            'Non-interactive Single Sign-On',
                            'via https://sso.facebook.com',
                        ],
                    ],
                    ['Require moderator approval on comment, if',
                        [
                            'Author is authenticated',
                            'Author has less than 42 approved comments',
                            'Author is registered less than 47 days ago',
                        ],
                    ],
                    ['Email moderators', 'Don\'t email'],
                    ['Extensions',
                        [
                            'Akismet',
                            'APILayer SpamChecker',
                            'Perspective',
                        ],
                    ],
                    ['Created',            REGEXES.datetime],
                    ['Number of comments', '0'],
                    ['Number of views',    '0'],
                ]);

                // Go to the domain list and verify there's a new domain
                cy.sidebarClick('Domains', PATHS.manage.domains);
                cy.texts('#domain-list .domain-host')         .should('arrayMatch', ['facebook.com:4551', DOMAINS.localhost.host]);
                cy.texts('#domain-list .domain-name')         .should('arrayMatch', ['Face Book', DOMAINS.localhost.name]);
                cy.texts('#domain-list app-domain-user-badge').should('arrayMatch', ['Owner', 'Owner']);
            });
        });
    });

    context('for editing existing domain', () => {

        const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).edit;

        it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.ace));

        context('unauthenticated user', () => {

            [
                {name: 'superuser', user: USERS.root,         dest: 'back'},
                {name: 'owner',     user: USERS.ace,          dest: 'back'},
                {name: 'moderator', user: USERS.king,         dest: 'to Domains', redir: PATHS.manage.domains._},
                {name: 'commenter', user: USERS.commenterTwo, dest: 'to Domains', redir: PATHS.manage.domains._},
                {name: 'readonly',  user: USERS.commenterOne, dest: 'to Domains', redir: PATHS.manage.domains._},
            ]
                .forEach(test =>
                    it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                        cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
        });

        context('for owner user', () => {

            beforeEach(() => {
                cy.loginViaApi(USERS.ace, pagePath);
                makeAliases(true);
                makeGeneralAliases(); // The General tab is already active
            });

            it('has all necessary controls', () => {
                // Check page content
                cy.get('@domainEdit').texts('li[ngbnavitem]')
                    .should('arrayMatch', ['General', 'Authentication' + '8', 'Moderation', 'Extensions']);
                cy.get('@btnCancel').should('be.visible');
                cy.get('@btnSubmit').should('be.visible').should('be.enabled').should('have.text', 'Save');

                // General
                checkActiveTabs([true, false, false, false]);
                cy.get('@host').should('be.visible').and('have.value', DOMAINS.localhost.host).and('be.disabled');
                cy.get('@name').should('be.visible').and('have.value', DOMAINS.localhost.name).and('be.enabled');
                cy.get('@sortTA').should('be.checked');

                // Authentication
                cy.get('@tabAuth').click();
                checkActiveTabs([false, true, false, false]);
                makeAuthAliases(true);
                cy.get('@authAnonymous').should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authLocal')    .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authFacebook') .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGithub')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGitlab')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGoogle')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authTwitter')  .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authSso')      .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authSsoUrl')   .should('be.visible').and('be.enabled').and('have.value', `${Cypress.config().baseUrl}/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`);
                cy.get('@authSsoNonInt').should('be.visible').and('be.enabled').and('be.checked');

                // Moderation
                cy.get('@tabModeration').click();
                checkActiveTabs([false, false, true, false]);
                makeModerationAliases();
                cy.get('@modAnonymous')          .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modAuthenticated')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modNumCommentsOn')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modUserAgeDaysOn')      .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modLinks')              .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modImages')             .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modNotifyPolicyNone')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@modNotifyPolicyPending').should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@modNotifyPolicyAll')    .should('be.visible').and('be.enabled').and('not.be.checked');

                // Extensions
                cy.get('@tabExtensions').click();
                checkActiveTabs([false, false, false, true]);
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')    .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extApiLayerEnabled')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extPerspectiveEnabled').should('be.visible').and('be.enabled').and('not.be.checked');

                // Back to General
                cy.get('@tabGeneral').click();
                checkActiveTabs([true, false, false, false]);

                // Click on Cancel and return to domain properties
                cy.get('@btnCancel').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
            });

            it('validates input', () => {
                // Make form invalid, then click on Submit to engage validation
                cy.get('@domainEdit').find('#name').setValue('x'.repeat(256));
                cy.get('@btnSubmit').click();
                checkValidations(false, true);
            });

            it('allows to edit domain', () => {
                cy.get('@name').setValue('Big Time');
                cy.get('@sortSA').clickLabel();
                // -- Auth
                cy.get('@tabAuth').click();
                makeAuthAliases(false);
                cy.get('@authAnonymous').clickLabel();
                cy.get('@authLocal')    .clickLabel();
                cy.get('@authFacebook') .clickLabel();
                cy.get('@authGithub')   .clickLabel();
                cy.get('@authGitlab')   .clickLabel();
                cy.get('@authGoogle')   .clickLabel();
                cy.get('@authTwitter')  .clickLabel();
                cy.get('@authSso')      .clickLabel();
                // Check there's "no auth method available" warning
                cy.contains('div[ngbnavpane] .form-text', 'No authentication method enabled').should('be.visible');
                // Enable local
                cy.get('@authLocal').clickLabel();

                // -- Moderation
                cy.get('@tabModeration').click();
                makeModerationAliases();
                cy.get('@modAnonymous')      .clickLabel();
                cy.get('@modAuthenticated')  .clickLabel();
                cy.get('@modNumCommentsOn')  .clickLabel();
                cy.get('@modUserAgeDaysOn')  .clickLabel();
                cy.get('@modLinks')          .clickLabel();
                cy.get('@modImages')         .clickLabel();
                cy.get('@modNotifyPolicyAll').clickLabel();
                cy.get('app-domain-edit #mod-num-comments') .setValue('15');
                cy.get('app-domain-edit #mod-user-age-days').setValue('672');
                // -- Extensions
                cy.get('@tabExtensions').click();
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')                                    .clickLabel();
                cy.get('app-domain-edit #extension-akismet-config')             .setValue('name=akismet\nfoo=bar');
                cy.get('@extApiLayerEnabled')                                   .clickLabel();
                cy.get('app-domain-edit #extension-apiLayer-spamChecker-config').setValue('name=apiLayer-spamChecker\nbaz=42');
                cy.get('@extPerspectiveEnabled')                                .clickLabel();
                cy.get('app-domain-edit #extension-perspective-config')         .setValue('name=perspective\nabc=xyz');
                cy.get('app-domain-edit button[type=submit]').click();
                cy.toastCheckAndClose('data-saved');
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).props);

                // Verify properties
                cy.get('#domain-detail-table').dlTexts().should('matrixMatch', [
                    ['Host',                                                    DOMAINS.localhost.host],
                    ['Name',                                                    'Big Time'],
                    ['Read-only',                                               ''],
                    ['Default comment sort',                                    'Least upvoted first'],
                    ['Authentication'],
                        ['Enable commenter registration via external provider', '✔'],
                        ['Enable local commenter registration',                 '✔'],
                        ['Enable commenter registration via SSO',               '✔'],
                    ['Comments'],
                        ['Allow comment authors to delete comments',            '✔'],
                        ['Allow moderators to delete comments',                 '✔'],
                        ['Allow comment authors to edit comments',              '✔'],
                        ['Allow moderators to edit comments',                   '✔'],
                        ['Enable voting on comments',                           '✔'],
                        ['Show deleted comments',                               '✔'],
                    ['Markdown'],
                        ['Enable images in comments',                           '✔'],
                        ['Enable links in comments',                            '✔'],
                        ['Enable tables in comments',                           '✔'],
                    ['Authentication methods',                                  'Local (password-based)'],
                    ['Require moderator approval on comment, if',
                        [
                            'Author is authenticated',
                            'Author has less than 15 approved comments',
                            'Author is registered less than 672 days ago',
                            'Comment contains link',
                            'Comment contains image',
                        ],
                    ],
                    ['Email moderators', 'For all new comments'],
                    ['Extensions',
                        [
                            'Akismet',
                            'APILayer SpamChecker',
                            'Perspective',
                        ],
                    ],
                    ['Created',            REGEXES.datetime],
                    ['Number of comments', '16'],
                    ['Number of views',    '5'],
                ]);

                // Edit the domain again and verify control values
                cy.contains('app-domain-detail a', 'Edit settings').click();
                cy.isAt(pagePath);
                // -- General
                cy.get('app-domain-edit').find('#name')   .should('have.value', 'Big Time');
                cy.get('app-domain-edit').find('#sort-sa').should('be.checked');
                // -- Auth
                cy.contains('app-domain-edit li[ngbnavitem]', 'Authentication').click();
                cy.get('app-domain-edit #auth-anonymous').should('not.be.checked');
                cy.get('app-domain-edit #auth-local')    .should('be.checked');
                cy.get('app-domain-edit #auth-facebook') .should('not.be.checked');
                cy.get('app-domain-edit #auth-github')   .should('not.be.checked');
                cy.get('app-domain-edit #auth-gitlab')   .should('not.be.checked');
                cy.get('app-domain-edit #auth-google')   .should('not.be.checked');
                cy.get('app-domain-edit #auth-twitter')  .should('not.be.checked');
                cy.get('app-domain-edit #auth-sso')      .should('not.be.checked');
                // -- Moderation
                cy.contains('app-domain-edit li[ngbnavitem]', 'Moderation').click();
                cy.get('app-domain-edit #mod-anonymous')        .should('not.be.checked');
                cy.get('app-domain-edit #mod-authenticated')    .should('be.checked');
                cy.get('app-domain-edit #mod-num-comments-on')  .should('be.checked');
                cy.get('app-domain-edit #mod-num-comments')     .should('have.value', '15');
                cy.get('app-domain-edit #mod-user-age-days-on') .should('be.checked');
                cy.get('app-domain-edit #mod-user-age-days')    .should('have.value', '672');
                cy.get('app-domain-edit #mod-links')            .should('be.checked');
                cy.get('app-domain-edit #mod-images')           .should('be.checked');
                cy.get('app-domain-edit #mod-notify-policy-all').should('be.checked');
                // -- Extensions
                cy.contains('app-domain-edit li[ngbnavitem]', 'Extensions').click();
                cy.get('app-domain-edit #extension-akismet-enabled')             .should('be.checked');
                cy.get('app-domain-edit #extension-akismet-config')              .should('have.value', 'name=akismet\nfoo=bar');
                cy.get('app-domain-edit #extension-apiLayer-spamChecker-enabled').should('be.checked');
                cy.get('app-domain-edit #extension-apiLayer-spamChecker-config') .should('have.value', 'name=apiLayer-spamChecker\nbaz=42');
                cy.get('app-domain-edit #extension-perspective-enabled')         .should('be.checked');
                cy.get('app-domain-edit #extension-perspective-config')          .should('have.value', 'name=perspective\nabc=xyz');

                // Go to the domain list and verify the domain is updated
                cy.sidebarClick('Domains', PATHS.manage.domains);
                cy.texts('#domain-list .domain-host')         .should('arrayMatch', [DOMAINS.localhost.host]);
                cy.texts('#domain-list .domain-name')         .should('arrayMatch', ['Big Time']);
                cy.texts('#domain-list app-domain-user-badge').should('arrayMatch', ['Owner']);
            });
        });
    });
});
