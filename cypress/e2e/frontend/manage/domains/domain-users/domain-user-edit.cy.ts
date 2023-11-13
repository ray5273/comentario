import { DOMAINS, PATHS, USERS } from '../../../../../support/cy-utils';

context('Domain User Edit page', () => {

    const usersPath         = PATHS.manage.domains.id(DOMAINS.localhost.id).users;
    const propsPagePathKing = `${usersPath}/${USERS.king.id}`;
    const pagePathKing      = `${propsPagePathKing}/edit`;

    const makeAliases = (user: Cypress.User) => {
        cy.get('app-domain-user-edit').as('userEdit');

        // Header
        cy.get('@userEdit').find('h1').should('have.text', 'Edit domain user').and('be.visible');
        cy.get('@userEdit').find('#domain-user-email').should('have.text', user.email).and('be.visible');

        // Form controls
        cy.get('@userEdit').find('#role-owner')    .as('roleOwner')    .next().should('have.text', 'Owner');
        cy.get('@userEdit').find('#role-moderator').as('roleModerator').next().should('have.text', 'Moderator');
        cy.get('@userEdit').find('#role-commenter').as('roleCommenter').next().should('have.text', 'Commenter');
        cy.get('@userEdit').find('#role-readonly') .as('roleReadonly') .next().should('have.text', 'Read-only');

        // Buttons
        cy.get('@userEdit').contains('.form-footer a', 'Cancel')    .as('btnCancel');
        cy.get('@userEdit').find('.form-footer button[type=submit]').as('btnSubmit');
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

    it('stays on the page after reload', () => {
        cy.verifyStayOnReload(pagePathKing, USERS.ace);

        // Test cancelling: we return to user properties
        makeAliases(USERS.king);
        cy.get('@btnCancel').click();
        cy.isAt(propsPagePathKing);
        cy.noToast();
    });

    [
        {name: 'superuser', user: USERS.root},
        {name: 'owner',     user: USERS.ace},
    ]
        .forEach(test => context(`allows ${test.name} to edit`, () => {

            [
                {name: 'moderator', user: USERS.king,           from: '@roleModerator', to: '@roleOwner',     expect: 'Owner'},
                {name: 'commenter', user: USERS.commenterTwo,   from: '@roleCommenter', to: '@roleModerator', expect: 'Moderator'},
                {name: 'read-only', user: USERS.commenterThree, from: '@roleReadonly',  to: '@roleCommenter', expect: 'Commenter'},
            ]
                .forEach(subj => it(`${subj.name} user`, () => {
                    // Login
                    cy.loginViaApi(test.user, `${usersPath}/${subj.user.id}/edit`);
                    makeAliases(subj.user);

                    // Check the correct role is selected
                    cy.get(subj.from).should('be.checked');

                    // Select a new role and save
                    cy.get(subj.to).clickLabel();
                    cy.get('@btnSubmit').click();

                    // We're back to user props
                    cy.isAt(`${usersPath}/${subj.user.id}`);
                    cy.toastCheckAndClose('data-saved');
                    cy.contains('app-domain-user-properties #domain-user-detail-table dt', 'Role')
                        .next().should('have.text', subj.expect);
                }));
        }));
});
