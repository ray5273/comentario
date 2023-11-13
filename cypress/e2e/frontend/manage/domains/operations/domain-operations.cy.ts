import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain Operations page', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).operations;

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

            it('shows available operations', () => {
                cy.loginViaApi(user, pagePath);
                cy.get('app-domain-operations').as('domainOperations');

                // Check heading
                cy.get('@domainOperations').find('h1').should('have.text', 'Operations').and('be.visible');
                cy.get('@domainOperations').find('header app-domain-badge').should('have.text', DOMAINS.localhost.host);

                // Clone
                cy.get('@domainOperations').contains('button', 'Clone').click();
                cy.isAt(PATHS.manage.domains.id(DOMAINS.localhost.id).clone);

                // Export
                cy.visit(pagePath);
                cy.get('@domainOperations').contains('button', 'Export').click();
                cy.toastCheckAndClose('file-downloaded');
                cy.readFile(Cypress.config('downloadsFolder') + '/localhost_8000*.json.gz');
                // TODO
            });
        }));
});
