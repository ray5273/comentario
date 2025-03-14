import { DOMAINS, PATHS, REGEXES, USERS } from '../../../../../support/cy-utils';

context('Domain User Properties', () => {

    const usersPath    = PATHS.manage.domains.id(DOMAINS.localhost.id).users;
    const pagePathKing = `${usersPath}/${USERS.king.id}`;
    const pagePathAce  = `${usersPath}/${USERS.ace.id}`;

    const makeAliases = () => {
        cy.get('app-domain-user-properties').as('userProps');

        // Header
        cy.get('@userProps').find('h1').should('have.text', 'Domain user properties').and('be.visible');

        // User details
        cy.get('@userProps').find('#domainUserDetailTable').as('userDetails');

        // Buttons
        cy.get('@userProps').contains('a', 'Edit').as('btnEdit').should('be.visible').and('not.have.class', 'disabled');

        // Related user details
        cy.get('@userProps').contains('h2', 'Related user properties').should('be.visible');
        cy.get('@userProps').find('#user-details .detail-table').as('relatedUserDetails').should('be.visible');

        // Comments
        cy.get('@userProps').contains('h2', 'Comments').should('be.visible');
        cy.get('@userProps').find('app-comment-list').as('commentList').should('be.visible');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'read-only',  user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePathKing, test.user, test.redir)));
    });

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(pagePathKing, USERS.ace));

    context('shows user properties', () => {

        [
            {name: 'superuser', user: USERS.root},
            {name: 'owner',     user: USERS.ace},
        ]
            .forEach(({name, user}) =>
                it(`for ${name}`, () => {
                    cy.loginViaApi(user, pagePathKing);
                    makeAliases();

                    // Check user details
                    cy.get('@userDetails').dlTexts().should('matrixMatch', [
                        ['Role',                         'Moderator'],
                        ['Reply notifications',          '✔'],
                        ['Moderator notifications',      '✔'],
                        ['Comment status notifications', '✔'],
                        ['Created',                      REGEXES.datetime],
                    ]);

                    // Check related user details
                    cy.get('@relatedUserDetails').dlTexts().should('matrixMatch',
                        user.isSuper ?
                            [
                                ['ID',                      USERS.king.id],
                                ['Name',                    USERS.king.name],
                                ['Email',                   USERS.king.email],
                                ['Language',                'en'],
                                ['Remarks',                 'Almighty king'],
                                ['Confirmed',               REGEXES.checkDatetime],
                                ['Created',                 REGEXES.datetime],
                                ['Last password change',    REGEXES.datetime],
                                ['Last login',              '(never)'],
                                ['Number of owned domains', '1'],
                            ] :
                            [
                                ['ID',                      USERS.king.id],
                                ['Name',                    USERS.king.name],
                                ['Email',                   USERS.king.email],
                                ['Language',                'en'],
                                ['Confirmed',               REGEXES.checkDatetime],
                                ['Created',                 REGEXES.datetime],
                                ['Last login',              '(never)'],
                            ]);

                    // Check comments
                    cy.get('@commentList').verifyListFooter(4, false);
                    cy.get('@commentList').texts('.list-group-item app-user-link .user-name').should('arrayMatch', Array(4).fill(USERS.king.name));

                    // Click on Edit and land on the Edit user page
                    cy.get('@btnEdit').click();
                    cy.isAt(`${usersPath}/${USERS.king.id}/edit`);
                }));

        it('for the user self', () => {
            cy.loginViaApi(USERS.ace, pagePathAce);
            makeAliases();

            // Check user details
            cy.get('@userDetails').dlTexts().should('matrixMatch', [
                ['Role',                         'Owner'],
                ['Reply notifications',          '✔'],
                ['Moderator notifications',      '✔'],
                ['Comment status notifications', '✔'],
                ['Created',                      REGEXES.datetime],
            ]);

            // Check related user details
            cy.get('@relatedUserDetails').dlTexts().should('matrixMatch', [
                ['ID',         USERS.ace.id + 'You'],
                ['Name',       USERS.ace.name],
                ['Email',      USERS.ace.email],
                ['Language',   'en'],
                ['Confirmed',  REGEXES.checkDatetime],
                ['Created',    REGEXES.datetime],
                ['Last login', REGEXES.datetime],
            ]);

            // Click on Edit and land on the Edit user page
            cy.get('@btnEdit').click();
            cy.isAt(`${pagePathAce}/edit`);
        });
    });
});
