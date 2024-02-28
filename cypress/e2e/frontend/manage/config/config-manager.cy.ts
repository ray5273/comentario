import { DYN_CONFIG_ITEMS, PATHS, REGEXES, USERS } from '../../../../support/cy-utils';

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
            cy.get('app-static-config #static-config-items').dlTexts().should('matrixMatch', [
                ['Base Comentario URL',                     Cypress.config().baseUrl + '/'],
                ['Base documentation URL',                  'https://edge.docs.comentario.app'],
                ['Comentario version',                      /^\d+.\d+/],
                ['Build date',                              REGEXES.datetime],
                ['Current server time',                     REGEXES.datetime],
                ['Database version',                        /^(PostgreSQL|SQLite)/],
                ['Default UI language ID',                  'en'],
                ['Homepage content URL',                    'https://edge.docs.comentario.app/en/embed/front-page/'],
                ['Configured federated identity providers', ['Facebook', 'GitHub', 'GitLab', 'Google', 'Twitter']],
                ['Max. number of items per page',           '25'],
                ['Available UI languages',                  'en' + 'English (English)'],
                ['Enabled extensions',                      ['Akismet', 'APILayer SpamChecker', 'Perspective']],
            ]);
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

        it('allows to edit config items', () => {
            cy.loginViaApi(USERS.root, pagePathDynamic);

            // Check the items
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch', [
                ['New commenters must confirm their email',             ''],
                ['New users must confirm their email',                  '✔'],
                ['Enable registration of new users',                    '✔'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Show deleted comments',                               '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
                ['Use Gravatar for user avatars',                       ''],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
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
            cy.get('@configEdit').find('#auth_signup_confirm_commenter')              .should('not.be.checked').clickLabel().should('be.checked');
            cy.get('@configEdit').find('#auth_signup_confirm_user')                   .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#auth_signup_enabled')                        .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_deletion_author')   .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_deletion_moderator').should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_editing_author')    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_editing_moderator') .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_enableVoting')      .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_comments_showDeleted')       .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableLocal')         .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableFederated')     .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_signup_enableSso')           .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#domain_defaults_useGravatar')                .should('not.be.checked').clickLabel().should('be.checked');
            cy.get('@configEdit').find('#markdown_images_enabled')                    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#markdown_links_enabled')                     .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#markdown_tables_enabled')                    .should('be.checked')    .clickLabel().should('not.be.checked');
            cy.get('@configEdit').find('#operation_newOwner_enabled')                 .should('not.be.checked').clickLabel().should('be.checked');

            // Submit and get a success toast
            cy.get('@configEdit').find('button[type=submit]').should('have.text', 'Save').click();
            cy.isAt(pagePathDynamic);
            cy.toastCheckAndClose('data-saved');

            // Verify the updated config
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch', [
                ['New commenters must confirm their email',             '✔'],
                ['New users must confirm their email',                  ''],
                ['Enable registration of new users',                    ''],
                ['Allow comment authors to delete comments',            ''],
                ['Allow moderators to delete comments',                 ''],
                ['Allow comment authors to edit comments',              ''],
                ['Allow moderators to edit comments',                   ''],
                ['Enable voting on comments',                           ''],
                ['Show deleted comments',                               ''],
                ['Enable commenter registration via external provider', ''],
                ['Enable local commenter registration',                 ''],
                ['Enable commenter registration via SSO',               ''],
                ['Use Gravatar for user avatars',                       '✔'],
                ['Enable images in comments',                           ''],
                ['Enable links in comments',                            ''],
                ['Enable tables in comments',                           ''],
                ['Non-owner users can add domains',                     '✔'],
            ]);

            // Reset the config to the defaults
            cy.contains('app-dynamic-config button', 'Reset to defaults').click();
            cy.confirmationDialog('Are you sure you want to reset the configuration to defaults?').dlgButtonClick('Reset configuration');
            cy.toastCheckAndClose('data-updated');
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch',  [
                ['New commenters must confirm their email',             '✔'],
                ['New users must confirm their email',                  '✔'],
                ['Enable registration of new users',                    '✔'],
                ['Allow comment authors to delete comments',            '✔'],
                ['Allow moderators to delete comments',                 '✔'],
                ['Allow comment authors to edit comments',              '✔'],
                ['Allow moderators to edit comments',                   '✔'],
                ['Enable voting on comments',                           '✔'],
                ['Show deleted comments',                               '✔'],
                ['Enable commenter registration via external provider', '✔'],
                ['Enable local commenter registration',                 '✔'],
                ['Enable commenter registration via SSO',               '✔'],
                ['Use Gravatar for user avatars',                       '✔'],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            '✔'],
                ['Enable tables in comments',                           '✔'],
                ['Non-owner users can add domains',                     ''],
            ]);

            // Tweak the config using backend calls
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.authSignupConfirmCommenter,             false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.authSignupConfirmUser,                  false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.authSignupEnabled,                      false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsCommentDeletionAuthor,    false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsCommentDeletionModerator, false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsCommentEditingAuthor,     false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsCommentEditingModerator,  false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsEnableCommentVoting,      false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsShowDeletedComments,      false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsLocalSignupEnabled,       false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsFederatedSignupEnabled,   false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsSsoSignupEnabled,         false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.domainDefaultsUseGravatar,              false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.markdownImagesEnabled,                  true);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.markdownLinksEnabled,                   false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.markdownTablesEnabled,                  false);
            cy.backendSetDynConfigItem(DYN_CONFIG_ITEMS.operationNewOwnerEnabled,               true);
            cy.reload();
            cy.get('app-dynamic-config #dynamic-config-items').dlTexts().should('matrixMatch',  [
                ['New commenters must confirm their email',             ''],
                ['New users must confirm their email',                  ''],
                ['Enable registration of new users',                    ''],
                ['Allow comment authors to delete comments',            ''],
                ['Allow moderators to delete comments',                 ''],
                ['Allow comment authors to edit comments',              ''],
                ['Allow moderators to edit comments',                   ''],
                ['Enable voting on comments',                           ''],
                ['Show deleted comments',                               ''],
                ['Enable commenter registration via external provider', ''],
                ['Enable local commenter registration',                 ''],
                ['Enable commenter registration via SSO',               ''],
                ['Use Gravatar for user avatars',                       ''],
                ['Enable images in comments',                           '✔'],
                ['Enable links in comments',                            ''],
                ['Enable tables in comments',                           ''],
                ['Non-owner users can add domains',                     '✔'],
            ]);
        });
    });
});
