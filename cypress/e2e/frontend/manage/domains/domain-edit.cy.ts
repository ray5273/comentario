import { DOMAINS, PATHS, USERS } from '../../../../support/cy-utils';

context('Domain Edit page', () => {

    const makeAliases = () => {
        cy.get('app-domain-edit').as('domainEdit');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'General')       .as('tabGeneral');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Authentication').as('tabAuth');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Moderation')    .as('tabModeration');
        cy.get('@domainEdit').contains('li[ngbnavitem]', 'Extensions')    .as('tabExtensions');
        cy.get('@domainEdit').contains('.form-footer a', 'Cancel')        .as('btnCancel');
        cy.get('@domainEdit').find('.form-footer button[type=submit]')    .as('btnSubmit');
    };
    const makeGeneralAliases = () => {
        cy.get('@domainEdit').find('#host').as('host');
        cy.get('@domainEdit').find('#name').as('name');
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
    const checkTabs = (activeState: boolean[]) =>
        cy.get('@domainEdit').find('a[ngbnavlink]').hasClass('active').should('arrayMatch', activeState);

    beforeEach(cy.backendReset);

    context('for creating new domain', () => {

        it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.manage.domains.create, USERS.ace));

        it(`redirects user to login and back`, () => cy.verifyRedirectsAfterLogin(PATHS.manage.domains.create, USERS.ace));

        context('for authenticated user', () => {

            beforeEach(() => {
                cy.loginViaApi(USERS.ace, PATHS.manage.domains.create);
                makeAliases();
            });

            it('has all necessary controls', () => {
                // Check page content
                cy.get('@domainEdit').get('h1').should('have.text', 'Create domain');
                cy.get('@domainEdit').texts('li[ngbnavitem]')
                    .should('arrayMatch', ['General', 'Authentication' + '6', 'Moderation', 'Extensions']);
                cy.get('@btnCancel').should('be.visible');
                cy.get('@btnSubmit').should('be.visible').should('be.enabled').should('have.text', 'Create');

                // General
                checkTabs([true, false, false, false]);
                makeGeneralAliases();
                cy.get('@host').should('be.visible').and('have.value', '').and('be.enabled');
                cy.get('@name').should('be.visible').and('have.value', '').and('be.enabled');
                cy.get('@sortTD').should('be.checked');

                // Authentication
                cy.get('@tabAuth').click();
                checkTabs([false, true, false, false]);
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
                checkTabs([false, false, true, false]);
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
                checkTabs([false, false, false, true]);
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')    .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extApiLayerEnabled')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extPerspectiveEnabled').should('be.visible').and('be.enabled').and('not.be.checked');


                // Back to General
                cy.get('@tabGeneral').click();
                checkTabs([true, false, false, false]);

                // Click on Cancel and return to domain list
                cy.get('@btnCancel').click();
                cy.isAt(PATHS.manage.domains);
            });

            it('validates input', () => {
                // Click on Submit to engage validation
                cy.get('@btnSubmit').click();

                // Host
                makeGeneralAliases();
                cy.get('@host').isInvalid('Please enter a valid domain host.')
                    .type('a')                                   .isValid()
                    .setValue('abc')                             .isValid()
                    .setValue('a.c')                             .isValid()
                    .setValue('abc.xy')                          .isValid()
                    .setValue('abc-xy')                          .isValid()
                    .setValue('abc.123')                         .isValid()
                    .setValue('1.a')                             .isValid()
                    .setValue('2.3')                             .isValid()
                    .setValue('2-abc.3-xyz')                     .isValid()
                    .setValue('2-abc.3-xyz:19828')               .isValid()
                    .setValue('abc!xy')                          .isInvalid()  // Bad character
                    .setValue('abc@xy')                          .isInvalid()  // Bad character
                    .setValue('abc#xy')                          .isInvalid()  // Bad character
                    .setValue('abc$xy')                          .isInvalid()  // Bad character
                    .setValue('abc%xy')                          .isInvalid()  // Bad character
                    .setValue('abc^xy')                          .isInvalid()  // Bad character
                    .setValue('abc&xy')                          .isInvalid()  // Bad character
                    .setValue('abc*xy')                          .isInvalid()  // Bad character
                    .setValue('abc(xy')                          .isInvalid()  // Bad character
                    .setValue('abc)xy')                          .isInvalid()  // Bad character
                    .setValue('abc_xy')                          .isInvalid()  // Bad character
                    .setValue('abc+xy')                          .isInvalid()  // Bad character
                    .setValue('abc=xy')                          .isInvalid()  // Bad character
                    .setValue('abc`xy')                          .isInvalid()  // Bad character
                    .setValue('abc~xy')                          .isInvalid()  // Bad character
                    .setValue('abc[xy')                          .isInvalid()  // Bad character
                    .setValue('abc]xy')                          .isInvalid()  // Bad character
                    .setValue('abc{xy')                          .isInvalid()  // Bad character
                    .setValue('abc}xy')                          .isInvalid()  // Bad character
                    .setValue('abc;xy')                          .isInvalid()  // Bad character
                    .setValue('abc\'xy')                         .isInvalid()  // Bad character
                    .setValue('abc"xy')                          .isInvalid()  // Bad character
                    .setValue('abc|xy')                          .isInvalid()  // Bad character
                    .setValue('abc\\xy')                         .isInvalid()  // Bad character
                    .setValue('abc<xy')                          .isInvalid()  // Bad character
                    .setValue('abc>xy')                          .isInvalid()  // Bad character
                    .setValue('abc,xy')                          .isInvalid()  // Bad character
                    .setValue('abc/xy')                          .isInvalid()  // Bad character
                    .setValue('abc?xy')                          .isInvalid()  // Bad character
                    .setValue('abcde' + '.xy'.repeat(85))        .isInvalid()  // 260 chars is bad
                    .setValue('abcd'  + '.xy'.repeat(85))        .isValid()    // 259 chars is OK (actually must be max. 253)
                    .setValue('abcd'.repeat(16))                 .isInvalid()  // Segment of 64 chars is bad
                    .type('{backspace}')                         .isValid()    // Segment of 63 chars is OK
                    .setValue(('abc'.repeat(21) + '.').repeat(4)).isInvalid()  // '.' at the end
                    .type('{backspace}')                         .isValid()    // 4 segments of 63 chars = 255 chars is OK (actually must be max. 253)
                    .setValue('abc:')                            .isInvalid()  // Colon without host is bad
                    .setValue('abc:1')                           .isValid()    // Host of 1 char is OK
                    .setValue('abc:123')                         .isValid()    // Host of 3 chars is OK
                    .setValue('abc:123456')                      .isInvalid()  // Host of 6 chars is bad
                    .setValue('abc:x')                           .isInvalid(); // Alpha host is bad

                // Name
                // TODO
            });
        });
    });

    context('for editing existing domain', () => {

        const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).edit;

        it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.ace));

        [
            {name: 'owner',     user: USERS.ace,          dest: 'back',       redir: undefined},
            {name: 'superuser', user: USERS.root,         dest: 'back',       redir: undefined},
            {name: 'moderator', user: USERS.king,         dest: 'to Domains', redir: PATHS.manage.domains._},
            {name: 'commenter', user: USERS.commenterTwo, dest: 'to Domains', redir: PATHS.manage.domains._},
            {name: 'readonly',  user: USERS.commenterOne, dest: 'to Domains', redir: PATHS.manage.domains._},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));

        context('for owner user', () => {

            beforeEach(() => {
                cy.loginViaApi(USERS.ace, pagePath);
                makeAliases();
            });

            it('has all necessary controls', () => {
                // Check page content
                cy.get('@domainEdit').get('h1').should('have.text', 'Edit domain');
                cy.get('@domainEdit').texts('li[ngbnavitem]')
                    .should('arrayMatch', ['General', 'Authentication' + '8', 'Moderation', 'Extensions']);
                cy.get('@btnCancel').should('be.visible');
                cy.get('@btnSubmit').should('be.visible').should('be.enabled').should('have.text', 'Save');

                // General
                checkTabs([true, false, false, false]);
                makeGeneralAliases();
                cy.get('@host').should('be.visible').and('have.value', DOMAINS.localhost.host).and('be.disabled');
                cy.get('@name').should('be.visible').and('have.value', DOMAINS.localhost.name).and('be.enabled');
                cy.get('@sortTA').should('be.checked');

                // Authentication
                cy.get('@tabAuth').click();
                checkTabs([false, true, false, false]);
                makeAuthAliases(true);
                cy.get('@authAnonymous').should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authLocal')    .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authFacebook') .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGithub')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGitlab')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authGoogle')   .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authTwitter')  .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authSso')      .should('be.visible').and('be.enabled').and('be.checked');
                cy.get('@authSsoUrl')   .should('be.visible').and('be.enabled').and('have.value', `http://localhost:8080/api/e2e/oauth/${DOMAINS.localhost.id}/sso/noninteractive`);
                cy.get('@authSsoNonInt').should('be.visible').and('be.enabled').and('be.checked');

                // Moderation
                cy.get('@tabModeration').click();
                checkTabs([false, false, true, false]);
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
                checkTabs([false, false, false, true]);
                makeExtensionsAliases();
                cy.get('@extAkismetEnabled')    .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extApiLayerEnabled')   .should('be.visible').and('be.enabled').and('not.be.checked');
                cy.get('@extPerspectiveEnabled').should('be.visible').and('be.enabled').and('not.be.checked');


                // Back to General
                cy.get('@tabGeneral').click();
                checkTabs([true, false, false, false]);

                // Click on Cancel and return to domain properties
                cy.get('@btnCancel').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).props);
            });

            it('validates input', () => {
                // TODO
            });
        });
    });
});
