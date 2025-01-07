import { InstanceConfigKey, PATHS, REGEXES, UI_LANGUAGES, USERS } from '../../../../support/cy-utils';

context('Config Manager', () => {

    const pagePath        = PATHS.manage.config._;
    const pagePathStatic  = PATHS.manage.config.static;
    const pagePathDynamic = PATHS.manage.config.dynamic._;

    //------------------------------------------------------------------------------------------------------------------

    before(cy.backendReset);

    context('unauthenticated user', () => {

        it(`redirects superuser to login and to static config`, () =>
            cy.verifyRedirectsAfterLogin(pagePath, USERS.root, pagePathStatic));

        it(`redirects regular user to login and to Dashboard`, () =>
            cy.verifyRedirectsAfterLogin(pagePath, USERS.ace, PATHS.manage.dashboard));
    });

    it('has all necessary controls', () => {
        cy.loginViaApi(USERS.root, pagePath);
        cy.isAt(pagePathStatic);

        // Check the heading
        cy.get('app-config-manager').as('configManager');
        cy.get('@configManager').find('h1').should('have.text', 'Configuration').and('be.visible');

        // Check tabs
        cy.get('@configManager').find('.nav-tabs').as('tabs')
            .texts('a[ngbNavLink]').should('arrayMatch', ['Static', 'Dynamic']);
        cy.get('@tabs').contains('a[ngbNavLink]', 'Static') .as('tabStatic') .should('have.class', 'active');
        cy.get('@tabs').contains('a[ngbNavLink]', 'Dynamic').as('tabDynamic').should('not.have.class', 'active');

        // Switch to Dynamic
        cy.get('@tabDynamic').click().should('have.class', 'active');
        cy.isAt(pagePathDynamic);

        // Switch back to Static
        cy.get('@tabStatic').click().should('have.class', 'active');
        cy.isAt(pagePathStatic);
    });

    context('Static config', () => {

        context('unauthenticated user', () => {

            it(`redirects superuser to login and back`, () =>
                cy.verifyRedirectsAfterLogin(pagePathStatic, USERS.root));

            it(`redirects regular user to login and to Dashboard`, () =>
                cy.verifyRedirectsAfterLogin(pagePathStatic, USERS.ace, PATHS.manage.dashboard));
        });

        it('stays on the page after reload', () => cy.verifyStayOnReload(pagePathStatic, USERS.root));

        it('shows config items', () => {
            cy.loginViaApi(USERS.root, pagePathStatic);

            // Check the items
            cy.get('app-static-config #static-config-items').as('cfgItems').dlTexts().should('matrixMatch', [
                ['Base Comentario URL',                     Cypress.config().baseUrl + '/'],
                ['Base documentation URL',                  'https://edge.docs.comentario.app'],
                ['Terms of Service URL',                    'https://edge.docs.comentario.app/en/legal/tos/'],
                ['Privacy Policy URL',                      'https://edge.docs.comentario.app/en/legal/privacy/'],
                ['Comentario version',                      ['1.2.3', 'No upgrade available.']],
                ['Build date',                              REGEXES.datetime],
                ['Current server time',                     REGEXES.datetime],
                ['Database version',                        'Multigalactic DB v417'],
                ['Default UI language ID',                  'en'],
                ['Homepage content URL',                    'https://edge.docs.comentario.app/en/embed/front-page/'],
                ['Configured federated identity providers', ['Facebook', 'GitHub', 'GitLab', 'Google', 'LinkedIn', 'Twitter']],
                ['Max. number of items per page',           '25'],
                ['Live update enabled',                     '✔'],
                ['Page view statistics enabled',            '✔'],
                ['Available UI languages',                  Object.entries(UI_LANGUAGES).map(([k, v]) => k+v)],
                ['Enabled extensions',                      ['Akismet', 'APILayer SpamChecker', 'Perspective']],
            ]);

            // Check clickable links
            const anchorOpts = {newTab: true, noOpener: true, noReferrer: true, noFollow: false};
            cy.get('@cfgItems').ddItem('Base Comentario URL')   .find('a').should('be.anchor', Cypress.config().baseUrl + '/',                          anchorOpts);
            cy.get('@cfgItems').ddItem('Base documentation URL').find('a').should('be.anchor', 'https://edge.docs.comentario.app/',                     anchorOpts);
            cy.get('@cfgItems').ddItem('Terms of Service URL')  .find('a').should('be.anchor', 'https://edge.docs.comentario.app/en/legal/tos/',        anchorOpts);
            cy.get('@cfgItems').ddItem('Privacy Policy URL')    .find('a').should('be.anchor', 'https://edge.docs.comentario.app/en/legal/privacy/',    anchorOpts);
            cy.get('@cfgItems').ddItem('Homepage content URL')  .find('a').should('be.anchor', 'https://edge.docs.comentario.app/en/embed/front-page/', anchorOpts);
        });

        it('shows available upgrade', () => {
            cy.backendUpdateLatestRelease('v2.89 BooBuster', 'v2.89', 'https://yktoo.com/en/software/comentario');
            cy.loginViaApi(USERS.root, pagePathStatic);
            cy.get('app-static-config #static-config-items').ddItem('Comentario version').find('a')
                .should(
                    'be.anchor',
                    'https://yktoo.com/en/software/comentario',
                    {newTab: true, noOpener: true, noReferrer: true, noFollow: false})
                .and('have.text', 'Upgrade available: v2.89 BooBuster');
        });
    });

    context('Dynamic config', () => {

        context('unauthenticated user', () => {

            it(`redirects superuser to login and back`, () =>
                cy.verifyRedirectsAfterLogin(pagePathDynamic, USERS.root));

            it(`redirects regular user to login and to Dashboard`, () =>
                cy.verifyRedirectsAfterLogin(pagePathDynamic, USERS.ace, PATHS.manage.dashboard));
        });

        it('stays on the page after reload', () => cy.verifyStayOnReload(pagePathDynamic, USERS.root));

        it('validates input', () => {
            cy.backendReset();
            cy.loginViaApi(USERS.root, PATHS.manage.config.dynamic.edit);
            cy.get('app-config-edit').as('configEdit');

            // Remove values from inputs and click Save to trigger validation
            cy.get('@configEdit').find('#auth_login_local_maxAttempts')           .as('auth_login_local_maxAttempts').clear();
            cy.get('@configEdit').find('#domain_defaults_comments_text_maxLength').as('domain_defaults_comments_text_maxLength').clear();
            cy.get('@configEdit').find('button[type=submit]').click();

            // Still on the edit page
            cy.isAt(PATHS.manage.config.dynamic.edit);

            // Check validations: only makes sense for inputs
            cy.get('@auth_login_local_maxAttempts')           .verifyNumericInputValidation(0, 2_147_483_647, true);
            cy.get('@domain_defaults_comments_text_maxLength').verifyNumericInputValidation(140, 1_048_576,   true);
        });

        it('allows to edit config items', () => {
            cy.backendReset();
            cy.loginViaApi(USERS.root, pagePathDynamic);

            // Check the items
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch', [
                ['Authentication'],
                    ['Allow users to update their emails',                  ''],
                    ['Max. failed login attempts',                          '5'],
                    ['New commenters must confirm their email',             ''],
                    ['New users must confirm their email',                  '✔'],
                    ['Enable registration of new users',                    '✔'],
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
                    ['Maximum comment text length',                         '1,024'],
                ['Integrations'],
                    ['Use Gravatar for user avatars',                       ''],
                ['Markdown'],
                    ['Enable images in comments',                           '✔'],
                    ['Enable links in comments',                            '✔'],
                    ['Enable tables in comments',                           '✔'],
                ['Miscellaneous'],
                    ['Non-owner users can add domains',                     ''],
            ]);

            // Click on Edit
            cy.contains('app-dynamic-config a', 'Edit').click();
            cy.isAt(PATHS.manage.config.dynamic.edit);

            // Test cancelling
            cy.contains('app-config-edit a', 'Cancel').click();
            cy.isAt(pagePathDynamic);

            // Edit again and toggle config items
            cy.contains('app-dynamic-config a', 'Edit').click();
            cy.get('app-config-edit').as('configEdit');
            cy.get('@configEdit').find('#auth_emailUpdate_enabled')                   .should('not.be.checked').clickLabel().should('be.checked');
            cy.get('@configEdit').find('#auth_login_local_maxAttempts')               .should('have.value', '5').setValue('42');
            cy.get('@configEdit').find('#auth_signup_confirm_commenter')              .should('not.be.checked').clickLabel().should('be.checked');
            cy.get('@configEdit').find('#auth_signup_confirm_user')                   .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#auth_signup_enabled')                        .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_deletion_author')   .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_deletion_moderator').should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_editing_author')    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_editing_moderator') .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_enableVoting')      .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_showDeleted')       .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_text_maxLength')    .should('have.value', '1024').setValue('876');
            cy.get('@configEdit').find('#domain_defaults_markdown_images_enabled')    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_markdown_links_enabled')     .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_markdown_tables_enabled')    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableLocal')         .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableFederated')     .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableSso')           .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#integrations_useGravatar')                   .should('not.be.checked').clickLabel().should('be.checked');
            cy.get('@configEdit').find('#operation_newOwner_enabled')                 .should('not.be.checked').clickLabel().should('be.checked');

            // Check reset buttons
            cy.get('@configEdit').find('#domain_defaults_comments_showDeleted-revert').click().should('not.exist');
            cy.get('@configEdit').find('#domain_defaults_comments_showDeleted').should('be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableLocal-revert').click().should('not.exist');
            cy.get('@configEdit').find('#domain_defaults_signup_enableLocal').should('be.checked');

            // Submit and get a success toast
            cy.get('@configEdit').find('button[type=submit]').should('have.text', 'Save').click();
            cy.isAt(pagePathDynamic);
            cy.toastCheckAndClose('data-saved');

            // Verify the updated config
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch', [
                ['Authentication'],
                    ['Allow users to update their emails',                  '✔'],
                    ['Max. failed login attempts',                          '42'],
                    ['New commenters must confirm their email',             '✔'],
                    ['New users must confirm their email',                  ''],
                    ['Enable registration of new users',                    ''],
                    ['Enable commenter registration via external provider', ''],
                    ['Enable local commenter registration',                 '✔'],
                    ['Enable commenter registration via SSO',               ''],
                ['Comments'],
                    ['Allow comment authors to delete comments',            ''],
                    ['Allow moderators to delete comments',                 ''],
                    ['Allow comment authors to edit comments',              ''],
                    ['Allow moderators to edit comments',                   ''],
                    ['Enable voting on comments',                           ''],
                    ['Show deleted comments',                               '✔'],
                    ['Maximum comment text length',                         '876'],
                ['Integrations'],
                    ['Use Gravatar for user avatars',                       '✔'],
                ['Markdown'],
                    ['Enable images in comments',                           ''],
                    ['Enable links in comments',                            ''],
                    ['Enable tables in comments',                           ''],
                ['Miscellaneous'],
                    ['Non-owner users can add domains',                     '✔'],
            ]);

            // Reset the config to the defaults
            cy.contains('app-dynamic-config button', 'Reset to defaults').click();
            cy.confirmationDialog('Are you sure you want to reset the configuration to defaults?').dlgButtonClick('Reset configuration');
            cy.toastCheckAndClose('data-updated');
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch',  [
                ['Authentication'],
                    ['Allow users to update their emails',                  ''],
                    ['Max. failed login attempts',                          '10'],
                    ['New commenters must confirm their email',             '✔'],
                    ['New users must confirm their email',                  '✔'],
                    ['Enable registration of new users',                    '✔'],
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
                    ['Maximum comment text length',                         '4,096'],
                ['Integrations'],
                    ['Use Gravatar for user avatars',                       '✔'],
                ['Markdown'],
                    ['Enable images in comments',                           ''],
                    ['Enable links in comments',                            '✔'],
                    ['Enable tables in comments',                           '✔'],
                ['Miscellaneous'],
                    ['Non-owner users can add domains',                     ''],
            ]);

            // Tweak the config using backend calls
            cy.backendUpdateDynConfig({
                [InstanceConfigKey.authEmailUpdateEnabled]:                 true,
                [InstanceConfigKey.authLoginLocalMaxAttempts]:              3,
                [InstanceConfigKey.authSignupConfirmCommenter]:             false,
                [InstanceConfigKey.authSignupConfirmUser]:                  false,
                [InstanceConfigKey.authSignupEnabled]:                      false,
                [InstanceConfigKey.domainDefaultsCommentDeletionAuthor]:    false,
                [InstanceConfigKey.domainDefaultsCommentDeletionModerator]: true,
                [InstanceConfigKey.domainDefaultsCommentEditingAuthor]:     true,
                [InstanceConfigKey.domainDefaultsCommentEditingModerator]:  false,
                [InstanceConfigKey.domainDefaultsEnableCommentVoting]:      false,
                [InstanceConfigKey.domainDefaultsShowDeletedComments]:      false,
                [InstanceConfigKey.domainDefaultsMaxCommentLength]:         516,
                [InstanceConfigKey.domainDefaultsMarkdownImagesEnabled]:    true,
                [InstanceConfigKey.domainDefaultsMarkdownLinksEnabled]:     false,
                [InstanceConfigKey.domainDefaultsMarkdownTablesEnabled]:    false,
                [InstanceConfigKey.domainDefaultsLocalSignupEnabled]:       false,
                [InstanceConfigKey.domainDefaultsFederatedSignupEnabled]:   false,
                [InstanceConfigKey.domainDefaultsSsoSignupEnabled]:         false,
                [InstanceConfigKey.integrationsUseGravatar]:                false,
                [InstanceConfigKey.operationNewOwnerEnabled]:               true,
            });

            // Reload the page and recheck
            cy.reload();
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch',  [
                ['Authentication'],
                    ['Allow users to update their emails',                  '✔'],
                    ['Max. failed login attempts',                          '3'],
                    ['New commenters must confirm their email',             ''],
                    ['New users must confirm their email',                  ''],
                    ['Enable registration of new users',                    ''],
                    ['Enable commenter registration via external provider', ''],
                    ['Enable local commenter registration',                 ''],
                    ['Enable commenter registration via SSO',               ''],
                ['Comments'],
                    ['Allow comment authors to delete comments',            ''],
                    ['Allow moderators to delete comments',                 '✔'],
                    ['Allow comment authors to edit comments',              '✔'],
                    ['Allow moderators to edit comments',                   ''],
                    ['Enable voting on comments',                           ''],
                    ['Show deleted comments',                               ''],
                    ['Maximum comment text length',                         '516'],
                ['Integrations'],
                    ['Use Gravatar for user avatars',                       ''],
                ['Markdown'],
                    ['Enable images in comments',                           '✔'],
                    ['Enable links in comments',                            ''],
                    ['Enable tables in comments',                           ''],
                ['Miscellaneous'],
                    ['Non-owner users can add domains',                     '✔'],
            ]);
        });
    });
});
