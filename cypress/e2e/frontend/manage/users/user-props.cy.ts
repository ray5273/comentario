import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../support/cy-utils';

context('User Properties page', () => {

    const pagePathKing = PATHS.manage.users.id(USERS.king.id).props;
    const pagePathAce  = PATHS.manage.users.id(USERS.ace.id).props;

    const makeAliases = (canBan: boolean, canDelete: boolean, isBanned: boolean) => {
        cy.get('app-user-properties').as('userProps');

        // Check heading
        cy.get('@userProps').find('h1').should('have.text', 'User properties').and('be.visible');

        // User details
        cy.get('@userProps').find('#user-details .detail-table').as('userDetails').should('be.visible');

        // Buttons
        cy.get('@userProps').contains('a', 'Edit user').as('btnEdit').should('be.visible');
        cy.get('@userProps').contains('button', isBanned ? 'Unban user' : 'Ban user').as('btnBan')
            .should('be.visible')
            .and(canBan   ? 'be.enabled' : 'be.disabled')
            .and(isBanned ? 'have.class' : 'not.have.class', 'active');
        cy.get('@userProps').contains('button', 'Delete user').as('btnDelete')
            .should('be.visible')
            .and(canDelete ? 'be.enabled' : 'be.disabled');

        // Domain roles
        cy.get('@userProps').find('#user-domain-roles').as('domainRoles')
            .contains('h2', 'Domain roles').should('be.visible');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        it(`redirects superuser to login and back`, () =>
            cy.verifyRedirectsAfterLogin(pagePathKing, USERS.root));

        it(`redirects regular user to login and to Dashboard`, () =>
            cy.verifyRedirectsAfterLogin(pagePathKing, USERS.ace, PATHS.manage.dashboard));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePathKing, USERS.root));

    context('shows properties', () => {

        it('of self-user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.root.id).props);
            makeAliases(false, false, false);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',           USERS.root.id + 'YOU'],
                ['Name',         USERS.root.name],
                ['Email',        USERS.root.email],
                ['Language',     'en'],
                ['Website URL',  'https://comentario.app/'],
                ['Confirmed',    REGEXES.checkDatetime],
                ['Superuser',    '✔'],
                ['Created',      REGEXES.datetime],
            ]);

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(0, false);

            // Click on Edit user and land on the Edit User page
            cy.get('@btnEdit').click();
            cy.isAt(PATHS.manage.users.id(USERS.root.id).edit);
        });

        it('of other user', () => {
            cy.loginViaApi(USERS.root, pagePathKing);
            makeAliases(true, true, false);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',        USERS.king.id],
                ['Name',      USERS.king.name],
                ['Email',     USERS.king.email],
                ['Language',  'en'],
                ['Remarks',   'Almighty king'],
                ['Confirmed', REGEXES.checkDatetime],
                ['Created',   REGEXES.datetime],
            ]);

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(4, false);
            cy.get('@domainRoles').texts('.domain-host').should('arrayMatch', [
                DOMAINS.factor.host,
                DOMAINS.localhost.host,
                DOMAINS.market.host,
                DOMAINS.spirit.host,
            ]);
            cy.get('@domainRoles').texts('app-domain-user-badge')
                .should('arrayMatch', ['Owner', 'Moderator', 'Commenter', 'Read-only']);

            // Click on Edit user and land on the Edit User page
            cy.get('@btnEdit').click();
            cy.isAt(PATHS.manage.users.id(USERS.king.id).edit);
        });

        it('of banned user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.banned.id).props);
            makeAliases(true, true, true);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',        USERS.banned.id],
                ['Name',      USERS.banned.name],
                ['Email',     USERS.banned.email],
                ['Language',  'en'],
                ['Banned',    REGEXES.checkDatetime],
                ['Confirmed', REGEXES.checkDatetime],
                ['Created',   REGEXES.datetime],
            ]);
        });
    });

    it('allows to delete user', () => {
        cy.loginViaApi(USERS.root, pagePathAce);
        makeAliases(true, true, false);

        // Click on Delete user and confirm
        cy.get('@btnDelete').click();
        cy.confirmationDialog(/Are you sure you want to delete this user\?/).dlgButtonClick('Delete user');

        // We're back to the User Manager and there's a success toast
        cy.isAt(PATHS.manage.users);
        cy.toastCheckAndClose('user-is-deleted');

        // One fewer on the list
        cy.get('app-user-manager #user-list').verifyListFooter(16, false);

        // The user is unable to log in
        cy.logout();
        cy.login(USERS.ace, {succeeds: false, errToast: 'invalid-credentials'});

        // Verify comments are still visible, but the author is "Deleted User"
        cy.testSiteVisit(TEST_PATHS.attr.noFonts);
        cy.commentTree('id', 'html', 'author')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - id: 69adf987-caec-4ad5-ae86-82c8f607d17a
                  author: '[Deleted User]'
                  html: <p>No root font for comments</p>
                  children:
                  - id: 29f0a6d8-267e-4ac7-9dac-af0a39ceb1bd
                    author: Anonymous
                    html: <p>No root font child</p>
              `);
    });

    it('allows to ban and unban user', () => {
        cy.loginViaApi(USERS.root, pagePathAce);
        makeAliases(true, true, false);

        // Click on Delete user and confirm
        cy.get('@btnBan').click();
        cy.confirmationDialog(/Are you sure you want to ban this user\?/).dlgButtonClick('Proceed');

        // We're still in user properties and there's a success toast
        cy.isAt(pagePathAce);
        cy.toastCheckAndClose('user-is-banned');
        cy.get('@userProps').contains('button', 'Unban user').should('have.class', 'active');

        // The user is unable to log in
        cy.logout();
        cy.login(USERS.ace, {succeeds: false, errToast: 'user-banned'});

        // Verify comments are still visible
        cy.testSiteVisit(TEST_PATHS.attr.noFonts);
        cy.commentTree('id', 'html', 'author')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - id: 69adf987-caec-4ad5-ae86-82c8f607d17a
                  author: Captain Ace
                  html: <p>No root font for comments</p>
                  children:
                  - id: 29f0a6d8-267e-4ac7-9dac-af0a39ceb1bd
                    author: Anonymous
                    html: <p>No root font child</p>
              `);

        // Relogin as root and unban the user
        cy.loginViaApi(USERS.root, pagePathAce);
        makeAliases(true, true, true);
        cy.get('@btnBan').click();
        cy.confirmationDialog('Are you sure you want to unban this user?').dlgButtonClick('Proceed');

        // We're still in user properties and there's a success toast
        cy.isAt(pagePathAce);
        cy.toastCheckAndClose('user-is-unbanned');
        cy.get('@userProps').contains('button', 'Ban user').should('not.have.class', 'active');

        // User can log in again
        cy.logout();
        cy.login(USERS.ace);

        // Relogin as root and ban the user, deleting their comments
        cy.loginViaApi(USERS.root, pagePathAce);
        makeAliases(true, true, false);

        // Click on Delete user and confirm
        cy.get('@btnBan').click();
        cy.confirmationDialog(/Are you sure you want to ban this user\?/).as('dlg');
        cy.get('@dlg').find('#ban-delete-comments').clickLabel().should('be.checked');
        cy.get('@dlg').dlgButtonClick('Proceed');

        // The user can't log in
        cy.logout();
        cy.login(USERS.ace, {succeeds: false, errToast: 'user-banned'});

        // Verify comments are gone
        cy.testSiteVisit(TEST_PATHS.attr.noFonts);
        cy.commentTree('id', 'html', 'author')
            .should(
                'yamlMatch',
                // language=yaml
                `
                - id: 69adf987-caec-4ad5-ae86-82c8f607d17a
                  author: Captain Ace
                  html: (deleted)
                  children:
                  - id: 29f0a6d8-267e-4ac7-9dac-af0a39ceb1bd
                    author: Anonymous
                    html: <p>No root font child</p>
              `);
    });
});
