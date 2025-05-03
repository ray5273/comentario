import { PATHS, TEST_PATHS, USERS } from '../../../../support/cy-utils';

context('User Manager', () => {

    const pagePath = PATHS.manage.users._;

    /** Users ordered by created time. */
    const users = [
        USERS.root,
        USERS.ace,
        USERS.king,
        USERS.queen,
        USERS.jack,
        USERS.commenterOne,
        USERS.commenterTwo,
        USERS.commenterThree,
        USERS.banned,
        USERS.facebookUser,
        USERS.githubUser,
        USERS.gitlabUser,
        USERS.googleUser,
        USERS.linkedinUser,
        USERS.twitterUser,
        USERS.ssoUser,
        USERS.anonymous,  // Created during migration
        USERS.johnDoeSso, // Created during test
    ];
    /** Users ordered by name. */
    const usersByName = users.slice().sort((a, b) => a.name.localeCompare(b.name));
    /** Users ordered by email. */
    const usersByEmail = users.slice().sort((a, b) => a.email.localeCompare(b.email));

    const makeAliases = () => {
        cy.get('app-user-manager').as('userManager');

        // Check heading
        cy.get('@userManager').find('h1').should('have.text', 'Users').and('be.visible');

        // Filter
        cy.get('@userManager').find('#sortByDropdown').as('sortDropdown');
        cy.get('@userManager').find('#filter-string').as('filterString').should('have.value', '');

        // Users
        cy.get('@userManager').find('#user-list').as('userList')
            .find('.list-group-item').should('have.length.above', 0);
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        it(`redirects superuser to login and back`, () =>
            cy.verifyRedirectsAfterLogin(pagePath, USERS.root));

        it(`redirects regular user to login and to Dashboard`, () =>
            cy.verifyRedirectsAfterLogin(pagePath, USERS.ace, PATHS.manage.dashboard));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePath, USERS.root));

    it('shows user list', () => {
        // Login with an SSO user to add it to the domain
        cy.testSiteVisit(TEST_PATHS.home);
        cy.testSiteSsoLogin();

        // Relogin as root
        cy.loginViaApi(USERS.root, pagePath);
        makeAliases();

        //--------------------------------------------------------------------------------------------------------------
        // Sorting
        //--------------------------------------------------------------------------------------------------------------

        // Check items: default sort is email ASC
        cy.get('@userManager').verifyListFooter(usersByEmail.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', usersByEmail.map(u => u.name));
        cy.get('@userList').texts('.user-email').should('arrayMatch', usersByEmail.map(u => u.email));

        // Sort by email DESC
        cy.get('@userManager').changeListSort('Email', 'asc', 'Email', 'desc');
        cy.get('@userManager').verifyListFooter(usersByEmail.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', usersByEmail.map(u => u.name).reverse());
        cy.get('@userList').texts('.user-email').should('arrayMatch', usersByEmail.map(u => u.email).reverse());

        // Sort by name ASC
        cy.get('@userManager').changeListSort('Email', 'desc', 'Name', 'asc');
        cy.get('@userManager').verifyListFooter(usersByName.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', usersByName.map(u => u.name));
        cy.get('@userList').texts('.user-email').should('arrayMatch', usersByName.map(u => u.email));

        // Sort by name DESC
        cy.get('@userManager').changeListSort('Name', 'asc', 'Name', 'desc');
        cy.get('@userManager').verifyListFooter(usersByName.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', usersByName.map(u => u.name).reverse());
        cy.get('@userList').texts('.user-email').should('arrayMatch', usersByName.map(u => u.email).reverse());

        // Sort by created ASC
        cy.get('@userManager').changeListSort('Name', 'desc', 'Created', 'asc');
        cy.get('@userManager').verifyListFooter(users.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', users.map(u => u.name));
        cy.get('@userList').texts('.user-email').should('arrayMatch', users.map(u => u.email));

        // Sort by created DESC
        cy.get('@userManager').changeListSort('Created', 'asc', 'Created', 'desc');
        cy.get('@userManager').verifyListFooter(users.length, false);
        cy.get('@userList').texts('.user-name') .should('arrayMatch', users.map(u => u.name).reverse());
        cy.get('@userList').texts('.user-email').should('arrayMatch', users.map(u => u.email).reverse());

        // Sort by IdP (no order check yet)
        cy.get('@userManager').changeListSort('Created', 'desc', 'Federated IdP', 'asc');
        cy.get('@userManager').changeListSort('Federated IdP', 'asc', 'Federated IdP', 'desc');

        //--------------------------------------------------------------------------------------------------------------
        // Filtering
        //--------------------------------------------------------------------------------------------------------------

        cy.get('@userManager').changeListSort('Federated IdP', 'desc', 'Email', 'asc');

        // Test filtering by email
        cy.get('@filterString').setValue('bLoG');
        cy.get('@userManager').verifyListFooter(3, false);
        cy.get('@userList').texts('.user-email').should('arrayMatch', [USERS.commenterOne.email, USERS.commenterThree.email, USERS.commenterTwo.email]);

        // Test filtering by name
        cy.get('@filterString').setValue('een');
        cy.get('@userManager').verifyListFooter(1, false);
        cy.get('@userList').texts('.user-email').should('arrayMatch', [USERS.queen.email]);

        // Test filtering by remarks
        cy.get('@filterString').setValue('aL');
        cy.get('@userManager').verifyListFooter(2, false);
        cy.get('@userList').texts('.user-email').should('arrayMatch', [USERS.jack.email, USERS.king.email]);

        //--------------------------------------------------------------------------------------------------------------
        // Open properties
        //--------------------------------------------------------------------------------------------------------------

        cy.get('@userList').find('.list-group-item').eq(1).click();
        cy.isAt(PATHS.manage.users.id(USERS.king.id).props);
    });

    it('retains chosen sort order', () => {
        cy.loginViaApi(USERS.root, pagePath);
        makeAliases();
        cy.checkListSortRetained(
            '@userManager',
            [
                {sort: 'Email',         order: 'asc'},
                {sort: 'Email',         order: 'desc'},
                {sort: 'Name',          order: 'asc'},
                {sort: 'Name',          order: 'desc'},
                {sort: 'Created',       order: 'asc'},
                {sort: 'Created',       order: 'desc'},
                {sort: 'Federated IdP', order: 'asc'},
                {sort: 'Federated IdP', order: 'desc'},
            ]);
    });
});
