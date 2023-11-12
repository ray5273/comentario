import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain User Manager', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).users;

    /** Users ordered by creation time. */
    const users = [USERS.ace, USERS.king, USERS.queen, USERS.jack, USERS.commenterTwo, USERS.commenterThree];
    /** Users ordered by name. */
    const usersByName = users.slice().sort((a, b) => a.name.localeCompare(b.name));
    /** Users ordered by email. */
    const usersByEmail = users.slice().sort((a, b) => a.email.localeCompare(b.email));

    const makeAliases = (hasItems: boolean, canLoadMore: boolean) => {
        cy.get('app-domain-user-manager').as('domainUserManager');

        // Check heading
        cy.get('@domainUserManager').find('h1').should('have.text', 'Domain users').and('be.visible');
        cy.get('@domainUserManager').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

        // Filter
        cy.get('@domainUserManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@domainUserManager').find('#filter-string').as('filterString').should('have.value', '');

        // Users
        if (hasItems) {
            cy.get('@domainUserManager').find('#domain-user-list').as('domainUserList').should('be.visible');
            if (canLoadMore) {
                cy.get('@domainUserManager').contains('app-list-footer button', 'Load more').as('loadMore');
            }
        }
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'readonly',   user: USERS.commenterThree, dest: 'to Domain Manager', redir: PATHS.manage.domains},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.ace));

    [
        {name: 'superuser', user: USERS.root},
        {name: 'owner',     user: USERS.ace},
    ]
        .forEach(({name, user}) => context(`for ${name} user`, () => {

            beforeEach(() => {
                cy.loginViaApi(user, pagePath);
                makeAliases(true, false);
            });

            it('shows domain user list list', () => {
                // Check items: default sort is email ASC
                cy.get('@domainUserList').verifyListFooter(usersByEmail.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByEmail.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByEmail.map(u => u.email));

                // Sort by email DESC
                cy.get('@domainUserManager').changeListSort('Email', 'desc');
                cy.get('@domainUserList').verifyListFooter(usersByEmail.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByEmail.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByEmail.map(u => u.email).reverse());

                // Sort by name ASC
                cy.get('@domainUserManager').changeListSort('Name', 'asc');
                cy.get('@domainUserList').verifyListFooter(usersByName.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByName.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByName.map(u => u.email));

                // Sort by name DESC
                cy.get('@domainUserManager').changeListSort('Name', 'desc');
                cy.get('@domainUserList').verifyListFooter(usersByName.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', usersByName.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', usersByName.map(u => u.email).reverse());

                // Sort by created ASC
                cy.get('@domainUserManager').changeListSort('Created', 'asc');
                cy.get('@domainUserList').verifyListFooter(users.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', users.map(u => u.name));
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', users.map(u => u.email));

                // Sort by created DESC
                cy.get('@domainUserManager').changeListSort('Created', 'desc');
                cy.get('@domainUserList').verifyListFooter(users.length, false);
                cy.get('@domainUserList').texts('.domain-user-name') .should('arrayMatch', users.map(u => u.name).reverse());
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', users.map(u => u.email).reverse());
            });

            it('filters items', () => {
                // Test filtering by email
                cy.get('@filterString').setValue('bLoG');
                cy.get('@domainUserList').verifyListFooter(2, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.commenterThree.email, USERS.commenterTwo.email]);

                // Test filtering by name
                cy.get('@filterString').setValue('een');
                cy.get('@domainUserList').verifyListFooter(1, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.queen.email]);

                // Test filtering by remarks
                cy.get('@filterString').setValue('aL');
                cy.get('@domainUserList').verifyListFooter(2, false);
                cy.get('@domainUserList').texts('.domain-user-email').should('arrayMatch', [USERS.jack.email, USERS.king.email]);
            });

            it('allows to open user properties', () => {
                cy.get('@domainUserList').find('.list-group-item').eq(3).click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).users + '/' + USERS.queen.id);
            });
        }));
});
