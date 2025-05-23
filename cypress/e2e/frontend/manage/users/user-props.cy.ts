import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../support/cy-utils';

context('User Properties page', () => {

    const pagePathKing = PATHS.manage.users.id(USERS.king.id).props;
    const pagePathAce  = PATHS.manage.users.id(USERS.ace.id).props;

    const makeAliases = (canEdit: boolean, canBan: boolean, canUnlock: boolean, canDelete: boolean, isBanned: boolean, hasAvatar: boolean, numSessions: number) => {
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
        if (canUnlock) {
            cy.get('@userProps').contains('button', 'Unlock user').as('btnUnlock').should('be.visible').and('be.enabled');
        } else {
            cy.get('@userProps').contains('button', 'Unlock user').should('not.exist');
        }
        cy.get('@userProps').contains('button', 'Delete user').as('btnDelete')
            .should('be.visible')
            .and(canDelete ? 'be.enabled' : 'be.disabled');

        // Domain roles
        cy.get('@userProps').find('#user-domain-roles').as('domainRoles')
            .contains('h2', 'Domain roles').should('be.visible');

        // Sessions
        cy.get('@userProps').find('#user-sessions').as('sessions')
            .contains('h2', 'User sessions').should('be.visible');
        cy.get('@sessions').contains('button', 'Expire all sessions').as('btnExpireAll')
            .should('be.visible').and(numSessions ? 'be.enabled' : 'be.disabled');
        cy.get('@sessions').verifyListFooter(numSessions, false);
    };

    const checkNoAttributes = () => cy.get('@userProps').find('app-attribute-table').should('not.exist');

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
            makeAliases(false, false, false, false, false, false, 0);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',             USERS.anonymous.id],
                ['Name',           USERS.anonymous.name],
                ['System account', '✔'],
            ]);

            // Verify no attributes section
            checkNoAttributes();

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(0, false);
        });

        it('of self-user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.root.id).props);
            makeAliases(true, false, false, false, false, false, 1);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',                   USERS.root.id + 'You'],
                ['Name',                 USERS.root.name],
                ['Email',                USERS.root.email],
                ['Language',             'en'],
                ['Website URL',          'https://comentario.app/'],
                ['Confirmed',            REGEXES.checkDatetime],
                ['Superuser',            '✔'],
                ['Created',              REGEXES.datetime],
                ['Last password change', REGEXES.datetime],
                ['Last login',           REGEXES.datetime],
                ['Signup IP',            '12.13.14.15'],
                ['Signup country',       'KZ — Kazakhstan'],
            ]);

            // Verify no attributes section
            checkNoAttributes();

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(0, false);

            // Verify sessions
            cy.get('@sessions').find('.list-group-item').should('have.length', 1)
                .eq(0)
                .should('contain.text', 'Expires')
                .and   ('contain.text', 'IP' + '127.0.x.x')
                .and   ('contain.text', 'Protocol' + 'HTTP/1.1')
                .and   ('contain.text', 'Browser')
                .and   ('contain.text', 'OS')
                .and   ('contain.text', 'Device');

            // Add a number of sessions, also verify IPv4/IPv6 handling
            const ips = [
                {ip: '25a1:69f4:7549:aede:dcb4:eeb2:a5b9:fb39', masked: '25a1:69f4:x:x:x:x:x:x'},
                {ip: '2f39:d1bf:3f46:804a:e0d5:d363:58ad:7505', masked: '2f39:d1bf:x:x:x:x:x:x'},
                {ip: '9add:7020:8b78:a0e9:08d7:8448:cc93:7463', masked: '9add:7020:x:x:x:x:x:x'},
                {ip: '100.18.128.203',                          masked: '100.18.x.x'},
                {ip: '144.88.212.207',                          masked: '144.88.x.x'},
                {ip: '99f1:3b39:a9ca:8ee7:1487:44d7:f172:0041', masked: '99f1:3b39:x:x:x:x:x:x'},
                {ip: '14e6:e493:f7d5:37f0:acff:97cf:5231:69e4', masked: '14e6:e493:x:x:x:x:x:x'},
                {ip: '692e:eace:c2a6:2578:0feb:c881:ab4a:2e14', masked: '692e:eace:x:x:x:x:x:x'},
                {ip: '253.163.62.29',                           masked: '253.163.x.x'},
                {ip: '3f3a:d69d:4f32:7e2f:2fea:fd8a:f675:52c9', masked: '3f3a:d69d:x:x:x:x:x:x'},
                {ip: 'd3bb:7047:0575:07f0:5f7d:24ca:a8dc:0acd', masked: 'd3bb:7047:x:x:x:x:x:x'},
                {ip: '95.152.88.191',                           masked: '95.152.x.x'},
                {ip: '1aa1:68ef:cb4d:6aa3:5c46:7c02:b22d:11ca', masked: '1aa1:68ef:x:x:x:x:x:x'},
                {ip: '13.236.68.193',                           masked: '13.236.x.x'},
                {ip: '246.135.197.133',                         masked: '246.135.x.x'},
                {ip: '196.200.212.51',                          masked: '196.200.x.x'},
                {ip: '28.203.37.94',                            masked: '28.203.x.x'},
                {ip: 'e00b:c94a:6bd9:43cb:1d0b:e906:e4df:8d65', masked: 'e00b:c94a:x:x:x:x:x:x'},
                {ip: '36.149.107.250',                          masked: '36.149.x.x'},
                {ip: 'e094:34ab:1f74:73ec:01c1:9589:6de0:0beb', masked: 'e094:34ab:x:x:x:x:x:x'},
                {ip: '00d1:5e11:f55e:4185:a085:b394:c9a1:cb40', masked: '00d1:5e11:x:x:x:x:x:x'},
                {ip: '241.106.249.173',                         masked: '241.106.x.x'},
                {ip: '16.20.108.170',                           masked: '16.20.x.x'},
                {ip: '40.94.28.67',                             masked: '40.94.x.x'},
                {ip: '4f77:8a4e:743f:3f6e:295d:fc89:5c33:5838', masked: '4f77:8a4e:x:x:x:x:x:x'},
                {ip: 'd0c7:89e2:769e:16e6:587d:b0e1:69d0:4758', masked: 'd0c7:89e2:x:x:x:x:x:x'},
                {ip: '41.89.5.20',                              masked: '41.89.x.x'},
                {ip: '6.167.244.55',                            masked: '6.167.x.x'},
                {ip: '184.120.226.0',                           masked: '184.120.x.x'},
                {ip: 'f9d3:69ce:cd25:4d98:58f8:e91e:84f3:6109', masked: 'f9d3:69ce:x:x:x:x:x:x'},
            ];
            ips.forEach(ip =>
                cy.testSiteLoginViaApi(
                    USERS.root,
                    undefined,
                    {headers: {[Math.random() < 0.5 ? 'X-Forwarded-For' : 'X-Real-Ip']: ip.ip}}));

            // Click on Edit user and land on the Edit User page
            cy.get('@btnEdit').click();
            cy.isAt(PATHS.manage.users.id(USERS.root.id).edit);

            // Cancel edit and get back
            cy.contains('app-user-edit .form-footer a', 'Cancel').click();
            cy.isAt(PATHS.manage.users.id(USERS.root.id).props);

            // We see the new sessions
            cy.get('@sessions').verifyListFooter(25, true);
            cy.get('@sessions').contains('app-list-footer button', 'Load more').click();
            cy.get('@sessions').verifyListFooter(31, false);
            cy.get('@sessions').find('.list-group-item').should('have.length', 31)
                // All sessions but the last one refer to the test site
                .each((item, idx) => {
                    const s = item.text();
                    if (idx < 30) {
                        expect(s).contains(DOMAINS.localhost.host);
                        expect(s).contains('IP' + ips[29-idx].masked); // Items are sorted in reverse chronological order
                    } else {
                        expect(s).not.contains(DOMAINS.localhost.host);
                        expect(s).contains('IP' + '127.0.x.x');
                    }
                });

            // Expire all sessions
            cy.get('@btnExpireAll').click();
            cy.confirmationDialog('Are you sure you want to expire all user\'s sessions?')
                .dlgButtonClick('Expire all sessions');

            // We're logged out
            cy.toastCheckAndClose('401');
        });

        it('of other user', () => {
            // Generate a few sessions
            cy.testSiteLoginViaApi(USERS.king, undefined, {headers: {'X-Real-Ip': '6.167.244.55'}});
            cy.testSiteLoginViaApi(USERS.king, undefined, {headers: {'X-Forwarded-For': 'd0c7:89e2:769e:16e6:587d:b0e1:69d0:4758,152.16.93.25'}});
            cy.testSiteLoginViaApi(USERS.king);

            cy.loginViaApi(USERS.root, pagePathKing);
            makeAliases(true, true, false, true, false, false, 4);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',                      USERS.king.id],
                ['Name',                    USERS.king.name],
                ['Email',                   USERS.king.email],
                ['Language',                'en'],
                ['Remarks',                 'Almighty king'],
                ['Confirmed',               REGEXES.checkDatetime],
                ['Created',                 REGEXES.datetime],
                ['Last password change',    REGEXES.datetime],
                ['Last login',              REGEXES.datetime],
                ['Number of owned domains', '1'],
            ]);

            // Verify no attributes section
            checkNoAttributes();

            // Verify domain roles
            cy.get('@domainRoles').verifyListFooter(4, false);
            cy.get('@domainRoles').texts('.domain-host').should('arrayMatch', [
                DOMAINS.factor.host,
                DOMAINS.localhost.host,
                DOMAINS.market.host,
                DOMAINS.spirit.host,
            ]);
            cy.get('@domainRoles').texts('app-domain-user-role-badge')
                .should('arrayMatch', ['Owner', 'Moderator', 'Commenter', 'Read-only']);

            // Click on Edit user and land on the Edit User page
            cy.get('@btnEdit').click();
            cy.isAt(PATHS.manage.users.id(USERS.king.id).edit);

            // Cancel edit and get back
            cy.contains('app-user-edit .form-footer a', 'Cancel').click();
            cy.isAt(pagePathKing);

            // Check the sessions: they all refer to the test site
            cy.get('@sessions').find('.list-group-item').should('have.length', 4)
                .texts()
                .should(tx => {
                    tx.forEach(s => expect(s).not.contains('Expired'));
                    expect(tx[0]).contains(DOMAINS.localhost.host).and.contains('IP' + '127.0.x.x');
                    expect(tx[1]).contains(DOMAINS.localhost.host).and.contains('IP' + 'd0c7:89e2:x:x:x:x:x:x');
                    expect(tx[2]).contains(DOMAINS.localhost.host).and.contains('IP' + '6.167.x.x (US)');
                    expect(tx[3])                                     .contains('IP' + '141.136.x.x (EG)');
                });

            // Expire all sessions
            cy.get('@btnExpireAll').click();
            cy.confirmationDialog('Are you sure you want to expire all user\'s sessions?')
                .dlgButtonClick('Expire all sessions');

            // All sessions are expired now
            cy.get('@sessions').find('.list-group-item').should('have.length', 4)
                .texts()
                .each(s => expect(s).contains('Expired'));

            // Check attributes
            cy.backendUpdateUserAttrs(USERS.king.id, {hoho: 'xyz'});
            cy.reload();
            cy.get('@userProps').find('app-attribute-table').as('attrs')
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
            cy.backendUpdateUserAttrs(USERS.king.id, {hoho: '', subscriptionId: '1234567890', active: 'true'});
            cy.reload();
            cy.get('@attrBtn').click();
            cy.get('@attrs').find('#attributes-container-1').should('be.visible')
                .find('.detail-table').dlTexts()
                // Attributes must be sorted by key
                .should('matrixMatch', [
                    ['active',         'true'],
                    ['subscriptionId', '1234567890'],
                ]);

            // Clean all and reload: no attributes section anymore
            cy.backendUpdateUserAttrs(USERS.king.id, {subscriptionId: '', active: ''});
            cy.reload();
            checkNoAttributes();
        });

        it('of banned user', () => {
            cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.banned.id).props);
            makeAliases(true, true, false, true, true, false, 0);

            // Verify user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['ID',                   USERS.banned.id],
                ['Name',                 USERS.banned.name],
                ['Email',                USERS.banned.email],
                ['Language',             'en'],
                ['Banned',               REGEXES.checkDatetime],
                ['Confirmed',            REGEXES.checkDatetime],
                ['Created',              REGEXES.datetime],
                ['Last password change', REGEXES.datetime],
                ['Last login',           '(never)'],
                ['Signup IP',            '251.248.14.143'],
                ['Signup country',       'UA — Ukraine'],
            ]);

            // Verify no attributes section
            checkNoAttributes();
        });
    });

    context('allows to delete user', () => {

        const delUser = (delComments: boolean, purge: boolean) => {
            cy.loginViaApi(USERS.root, pagePathAce);
            makeAliases(true, true, false, true, false, true, 0);

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
            cy.get('app-user-manager').verifyListFooter(16, false);

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
            makeAliases(true, true, false, true, false, true, 0);

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
            makeAliases(true, true, false, true, true, true, 0);
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

    it('allows to unlock user', () => {
        cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.linkedinUser.id).props);
        makeAliases(true, true, true, true, false, false, 1);

        // Verify user details: the user is locked
        cy.get('@userDetails').dlTexts().should('matrixMatch', [
            ['ID',                    USERS.linkedinUser.id],
            ['Federated user',        'oidc:linkedin/59866240'],
            ['Name',                  USERS.linkedinUser.name],
            ['Email',                 USERS.linkedinUser.email],
            ['Language',              'en'],
            ['Confirmed',             REGEXES.checkDatetime],
            ['Created',               REGEXES.datetime],
            ['Last password change',  REGEXES.datetime],
            ['Last login',            '(never)'],
            ['Failed login attempts', '7'],
            ['Locked',                REGEXES.checkDatetime],
        ]);

        // Unlock them
        cy.get('@btnUnlock').click();
        cy.toastCheckAndClose('user-is-unlocked');
        cy.get('@btnUnlock').should('not.exist');

        // No locked status or failed attempts anymore
        cy.get('@userDetails').dlTexts().should('matrixMatch', [
            ['ID',                    USERS.linkedinUser.id],
            ['Federated user',        'oidc:linkedin/59866240'],
            ['Name',                  USERS.linkedinUser.name],
            ['Email',                 USERS.linkedinUser.email],
            ['Language',              'en'],
            ['Confirmed',             REGEXES.checkDatetime],
            ['Created',               REGEXES.datetime],
            ['Last password change',  REGEXES.datetime],
            ['Last login',            '(never)'],
        ]);
    });
});
