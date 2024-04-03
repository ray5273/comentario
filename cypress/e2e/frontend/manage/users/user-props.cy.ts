import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../support/cy-utils';

context('User Properties page', () => {

    const pagePathKing = PATHS.manage.users.id(USERS.king.id).props;
    const pagePathAce  = PATHS.manage.users.id(USERS.ace.id).props;

    const makeAliases = (canEdit: boolean, canBan: boolean, canDelete: boolean, isBanned: boolean, hasAvatar: boolean) => {
        cy.get('app-user-properties').as('userProps');

        // Check heading
        cy.get('@userProps').find('h1').should('have.text', 'User properties').and('be.visible');

        // Avatar
        cy.get('@userProps').find('app-user-avatar').should( hasAvatar ? 'be.visible' : 'not.exist');

        // User details
        cy.get('@userProps').find('#user-details .detail-table').as('userDetails').should('be.visible');

        // Buttons
        cy.get('@userProps').contains('a', 'Edit user').as('btnEdit')
            .should('be.visible')
            .and(canEdit ? 'not.have.class' : 'have.class', 'disabled');
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

        it('of Anonymous user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.anonymous.id).props);
            makeAliases(false, false, false, false, false);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',             USERS.anonymous.id],
                ['Name',           USERS.anonymous.name],
                ['System account', '✔'],
            ]);

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(0, false);
        });

        it('of self-user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.root.id).props);
            makeAliases(true, false, false, false, false);

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
            makeAliases(true, true, true, false, false);

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
            makeAliases(true, true, true, true, false);

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

    context('allows to delete user', () => {

        const delUser = (delComments: boolean, purge: boolean) => {
            cy.loginViaApi(USERS.root, pagePathAce);
            makeAliases(true, true, true, false, true);

            // Click on Delete user
            cy.get('@btnDelete').click();

            // Confirmation dialog appears
            cy.confirmationDialog(/Are you sure you want to delete this user\?/).as('dlg');
            cy.get('@dlg').find('#delete-del-comments')  .as('delComments')  .should('not.be.checked');
            cy.get('@dlg').find('#delete-purge-comments').as('purgeComments').should('not.be.checked');

            // Tick off required checkboxes
            if (delComments) {
                cy.get('@delComments').clickLabel().should('be.checked');
                if (purge) {
                    cy.get('@purgeComments').clickLabel().should('be.checked');
                }
            }

            // Confirm deletion
            cy.get('@dlg').dlgButtonClick('Delete user');

            // We're back to the User Manager and there's a success toast
            cy.isAt(PATHS.manage.users);
            // We can't rely on the number of deleted comments (reported in details) as it varies among databases
            cy.toastCheckAndClose('user-is-deleted');

            // One fewer user on the list
            cy.get('app-user-manager #user-list').verifyListFooter(16, false);

            // The user is unable to log in
            cy.logout();
            cy.login(USERS.ace, {succeeds: false, errToast: 'invalid-credentials'});
        };

        it('keeping comments', () => {
            delUser(false, false);

            // Verify comments are still visible, but the author is "Deleted User"
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'html').should('yamlMatch',
                // language=yaml
                `
                - author: '[Deleted User]'
                  html: <p>Alright crew, let's gather around for a quick meeting. We've got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>
                  children:
                  - author: Engineer King
                    html: <p>What's on the agenda, captain?</p>
                    children:
                    - author: '[Deleted User]'
                      html: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                      children:
                      - author: Engineer King
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                      - author: Commenter Two
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        children:
                        - author: '[Deleted User]'
                          html: <p>Good work, navigator. That's what I was thinking too.</p>
                    - author: '[Deleted User]'
                      html: <p>What about supplies, cook?</p>
                      children:
                      - author: Cook Queen
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        children:
                        - author: '[Deleted User]'
                          html: <p>Absolutely, cook. I'll make a note of it.</p>
                - author: '[Deleted User]'
                  html: <p>Now, is there anything else anyone wants to bring up?</p>
                  children:
                  - author: Engineer King
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    children:
                    - author: '[Deleted User]'
                      html: <p>Alright, engineer. Let's schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                  - author: Navigator Jack
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    children:
                    - author: '[Deleted User]'
                      html: <p>Good point, navigator. I'll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                      children:
                      - author: Cook Queen
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        children:
                        - author: '[Deleted User]'
                          html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                `);
        });

        it('deleting comments', () => {
            delUser(true, false);

            // Verify comments' text is deleted as well
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'subtitle', 'html').should('yamlMatch',
                // language=yaml
                `
                - author: '[Deleted User]'
                  subtitle: 3 hours ago
                  html: '(deleted)'
                  children:
                  - author: Engineer King
                    subtitle: 2 hours ago
                    html: <p>What's on the agenda, captain?</p>
                    children:
                    - author: '[Deleted User]'
                      subtitle: 2 hours ago
                      html: '(deleted)'
                      children:
                      - author: Engineer King
                        subtitle: 2 hours ago
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                      - author: Commenter Two
                        subtitle: 2 hours ago
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        children:
                        - author: '[Deleted User]'
                          subtitle: 2 hours ago
                          html: '(deleted)'
                    - author: '[Deleted User]'
                      subtitle: 2 hours ago
                      html: '(deleted)'
                      children:
                      - author: Cook Queen
                        subtitle: 2 hours ago, edited by author 13 minutes ago
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        children:
                        - author: '[Deleted User]'
                          subtitle: 2 hours ago
                          html: '(deleted)'
                - author: '[Deleted User]'
                  subtitle: 2 hours ago
                  html: '(deleted)'
                  children:
                  - author: Engineer King
                    subtitle: 2 hours ago
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    children:
                    - author: '[Deleted User]'
                      subtitle: 2 hours ago
                      html: '(deleted)'
                  - author: Navigator Jack
                    subtitle: 2 hours ago
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    children:
                    - author: '[Deleted User]'
                      subtitle: 2 hours ago
                      html: '(deleted)'
                      children:
                      - author: Cook Queen
                        subtitle: 2 hours ago
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        children:
                        - author: '[Deleted User]'
                          subtitle: 2 hours ago
                          html: '(deleted)'
                `);
        });

        it('purging comments', () => {
            delUser(true, true);

            // Verify no comment at all as the root ones were by Ace
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'html').should('be.empty');
        });
    });

    context('allows to ban and unban user', () => {

        const banUser = (delComments: boolean, purge: boolean) => {
            cy.loginViaApi(USERS.root, pagePathAce);
            makeAliases(true, true, true, false, true);

            // Click on Ban user
            cy.get('@btnBan').click();

            // Confirmation dialog appears
            cy.confirmationDialog(/Are you sure you want to ban this user\?/).as('dlg');
            cy.get('@dlg').find('#ban-del-comments')  .as('delComments')  .should('not.be.checked');
            cy.get('@dlg').find('#ban-purge-comments').as('purgeComments').should('not.be.checked');

            // Tick off required checkboxes
            if (delComments) {
                cy.get('@delComments').clickLabel().should('be.checked');
                if (purge) {
                    cy.get('@purgeComments').clickLabel().should('be.checked');
                }
            }

            // Confirm banning
            cy.get('@dlg').dlgButtonClick('Proceed');

            // We're still in user properties and there's a success toast
            cy.isAt(pagePathAce);
            // We can't rely on the number of deleted comments (reported in details) as it varies among databases
            cy.toastCheckAndClose('user-is-banned');
            cy.get('@userProps').contains('button', 'Unban user').should('have.class', 'active');

            // The user is unable to log in
            cy.logout();
            cy.login(USERS.ace, {succeeds: false, errToast: 'user-banned'});
        };

        it('keeping comments', () => {
            banUser(false, false);

            // Verify comments are still visible
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'html').should('yamlMatch',
                // language=yaml
                `
                - author: Captain Ace
                  html: <p>Alright crew, let's gather around for a quick meeting. We've got a <b>long</b> voyage ahead of us, and I want to make sure everyone is on the same page.</p>
                  children:
                  - author: Engineer King
                    html: <p>What's on the agenda, captain?</p>
                    children:
                    - author: Captain Ace
                      html: <p>First off, we need to make sure the engine is in good working order. Any issues we need to address, <em>engineer</em>?</p>
                      children:
                      - author: Engineer King
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                      - author: Commenter Two
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        children:
                        - author: Captain Ace
                          html: <p>Good work, navigator. That's what I was thinking too.</p>
                    - author: Captain Ace
                      html: <p>What about supplies, cook?</p>
                      children:
                      - author: Cook Queen
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        children:
                        - author: Captain Ace
                          html: <p>Absolutely, cook. I'll make a note of it.</p>
                - author: Captain Ace
                  html: <p>Now, is there anything else anyone wants to bring up?</p>
                  children:
                  - author: Engineer King
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    children:
                    - author: Captain Ace
                      html: <p>Alright, engineer. Let's schedule a time for you to do a full inspection. I want to make sure everything is shipshape before we set sail.</p>
                  - author: Navigator Jack
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    children:
                    - author: Captain Ace
                      html: <p>Good point, navigator. I'll make sure our crew is well-armed and that we have extra lookouts posted. Safety is our top priority, after all.</p>
                      children:
                      - author: Cook Queen
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        children:
                        - author: Captain Ace
                          html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                `);

            // Relogin as root and unban the user
            cy.loginViaApi(USERS.root, pagePathAce);
            makeAliases(true, true, true, true, true);
            cy.get('@btnBan').click();
            cy.confirmationDialog('Are you sure you want to unban this user?').dlgButtonClick('Proceed');

            // We're still in user properties and there's a success toast
            cy.isAt(pagePathAce);
            cy.toastCheckAndClose('user-is-unbanned');
            cy.get('@userProps').contains('button', 'Ban user').should('not.have.class', 'active');

            // User can log in again
            cy.logout();
            cy.login(USERS.ace);
        });

        it('deleting comments', () => {
            banUser(true, false);

            // Verify comments text is gone
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'subtitle', 'html').should('yamlMatch',
                // language=yaml
                `
                - author: Captain Ace
                  subtitle: 3 hours ago, deleted by moderator just now
                  html: (deleted)
                  children:
                  - author: Engineer King
                    subtitle: 2 hours ago
                    html: <p>What's on the agenda, captain?</p>
                    children:
                    - author: Captain Ace
                      subtitle: 2 hours ago, deleted by moderator just now
                      html: (deleted)
                      children:
                      - author: Engineer King
                        subtitle: 2 hours ago
                        html: <p>Nothing major, captain. Just some routine maintenance to do, but we should be good to go soon.</p>
                      - author: Commenter Two
                        subtitle: 2 hours ago
                        html: <p>Captain, I've plotted our course, and I suggest we take the eastern route. It'll take us a bit longer, but we'll avoid any bad weather.</p>
                        children:
                        - author: Captain Ace
                          subtitle: 2 hours ago, deleted by moderator just now
                          html: (deleted)
                    - author: Captain Ace
                      subtitle: 2 hours ago, deleted by moderator just now
                      html: (deleted)
                      children:
                      - author: Cook Queen
                        subtitle: 2 hours ago, edited by author 13 minutes ago
                        html: <p>We've got enough food 🍖 and water 🚰 to last us for the whole journey, captain. But I do have a request. Could we get some fresh vegetables 🥕🥔🍅 and fruit 🍎🍐🍌 at our next port stop? It'll help us avoid scurvy.</p>
                        children:
                        - author: Captain Ace
                          subtitle: 2 hours ago, deleted by moderator just now
                          html: (deleted)
                - author: Captain Ace
                  subtitle: 2 hours ago, deleted by moderator just now
                  html: (deleted)
                  children:
                  - author: Engineer King
                    subtitle: 2 hours ago
                    html: <p>Captain, I've been noticing some strange vibrations in the engine room. It's nothing too serious, but I'd like to take a look at it just to be safe.</p>
                    children:
                    - author: Captain Ace
                      subtitle: 2 hours ago, deleted by moderator just now
                      html: (deleted)
                  - author: Navigator Jack
                    subtitle: 2 hours ago
                    html: <p><strong>Captain</strong>, one more thing. We'll be passing through some pirate-infested waters soon. Should we be concerned?</p>
                    children:
                    - author: Captain Ace
                      subtitle: 2 hours ago, deleted by moderator just now
                      html: (deleted)
                      children:
                      - author: Cook Queen
                        subtitle: 2 hours ago
                        html: <p>I can whip up some extra spicy food to make sure any pirates who try to board us get a taste of their own medicine! 🤣</p>
                        children:
                        - author: Captain Ace
                          subtitle: 2 hours ago, deleted by moderator just now
                          html: (deleted)
                `);
        });

        it('purging comments', () => {
            banUser(true, true);

            // Verify no comment at all as the root ones were by Ace
            cy.testSiteVisit(TEST_PATHS.home);
            cy.commentTree('author', 'html').should('be.empty');
        });
    });
});
