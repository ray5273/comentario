import { DOMAINS, PATHS, REGEXES, TEST_PATHS, USERS } from '../../../../../support/cy-utils';
import { EmbedUtils } from '../../../../../support/cy-embed-utils';

context('Domain User Edit page', () => {

    const usersPath         = PATHS.manage.domains.id(DOMAINS.localhost.id).users;
    const propsPagePathKing = `${usersPath}/${USERS.king.id}`;
    const pagePathKing      = `${propsPagePathKing}/edit`;

    const makeAliases = (user: Cypress.User, roleEditable: boolean) => {
        cy.get('app-domain-user-edit').as('userEdit');

        // Header
        cy.get('@userEdit').find('h1').should('have.text', 'Edit domain user').and('be.visible');
        cy.get('@userEdit').find('#domain-user-email').should('have.text', user.email).and('be.visible');

        // Form controls
        cy.get('@userEdit').find('#role-owner')           .as('roleOwner')           .should(roleEditable ? 'be.enabled' : 'be.disabled').next().should('have.text', 'Owner');
        cy.get('@userEdit').find('#role-moderator')       .as('roleModerator')       .should(roleEditable ? 'be.enabled' : 'be.disabled').next().should('have.text', 'Moderator');
        cy.get('@userEdit').find('#role-commenter')       .as('roleCommenter')       .should(roleEditable ? 'be.enabled' : 'be.disabled').next().should('have.text', 'Commenter');
        cy.get('@userEdit').find('#role-readonly')        .as('roleReadonly')        .should(roleEditable ? 'be.enabled' : 'be.disabled').next().should('have.text', 'Read-only');
        cy.get('@userEdit').find('#notify-replies')       .as('notifyReplies')       .should('be.enabled');
        cy.get('@userEdit').find('#notify-moderator')     .as('notifyModerator')     .should('be.enabled');
        cy.get('@userEdit').find('#notify-comment-status').as('notifyCommentStatus') .should('be.enabled');

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
        makeAliases(USERS.king, true);
        cy.get('@btnCancel').click();
        cy.isAt(propsPagePathKing);
        cy.noToast();
    });

    [
        {name: 'superuser', user: USERS.root, selfRoleCtl: '@roleCommenter'},
        {name: 'owner',     user: USERS.ace,  selfRoleCtl: '@roleOwner'},
    ]
        .forEach(test => context(`allows ${test.name} to edit`, () => {

            [
                {name: 'moderator', user: USERS.king,           from: '@roleModerator', to: '@roleOwner',     expect: 'Owner',     isModerator: true,  selfUser: false},
                {name: 'commenter', user: USERS.commenterTwo,   from: '@roleCommenter', to: '@roleModerator', expect: 'Moderator', isModerator: true,  selfUser: false},
                {name: 'read-only', user: USERS.commenterThree, from: '@roleReadonly',  to: '@roleCommenter', expect: 'Commenter', isModerator: false, selfUser: false},
                {name: 'self-user', user: test.user,            from: test.selfRoleCtl, to: '@roleOwner',     expect: 'Owner',     isModerator: true,  selfUser: true},
            ]
                .forEach(subj => it(`${subj.name} user`, () => {
                    // If it's root self-user test, first leave a comment to create a domain user for it
                    if (subj.selfUser && subj.user.isSuper) {
                        cy.testSiteLoginViaApi(test.user);
                        cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, null, 'I am root');
                    }

                    // Login
                    const roleEditable = !subj.selfUser || subj.user.isSuper;
                    cy.loginViaApi(test.user, `${usersPath}/${subj.user.id}/edit`);
                    makeAliases(subj.user, roleEditable);

                    // Check the input values are correct
                    cy.get(subj.from)             .should('be.checked');
                    cy.get('@notifyReplies')      .should('be.checked');
                    cy.get('@notifyModerator')    .should('be.checked');
                    cy.get('@notifyCommentStatus').should('be.checked');

                    // Select a new role (if allowed) and toggle notifications
                    if (roleEditable) {
                        cy.get(subj.to).clickLabel();
                    }
                    cy.get('@notifyReplies')      .click().should('not.be.checked');
                    cy.get('@notifyModerator')    .click().should('not.be.checked');
                    cy.get('@notifyCommentStatus').click().should('not.be.checked');

                    // Submit the form
                    cy.get('@btnSubmit').click();

                    // We're back to user props
                    cy.isAt(`${usersPath}/${subj.user.id}`);
                    cy.toastCheckAndClose('data-saved');
                    cy.get('app-domain-user-properties').as('userProps')
                        .find('#domainUserDetailTable').as('userDetails')
                        .dlTexts().should('matrixMatch', [
                            ['Role',                         subj.expect],
                            ['Reply notifications',          ''],
                            ['Moderator notifications',      ''],
                            ['Comment status notifications', ''],
                            ['Created',                      REGEXES.datetime],
                        ]);

                    // Edit the user again
                    cy.get('@userProps').contains('a', 'Edit').click();
                    cy.get('@notifyReplies')      .should('not.be.checked').click();
                    cy.get('@notifyModerator')    .should('not.be.checked');
                    cy.get('@notifyCommentStatus').should('not.be.checked').click();
                    cy.get('@btnSubmit').click();

                    // Verify the updated properties
                    cy.isAt(`${usersPath}/${subj.user.id}`);
                    cy.toastCheckAndClose('data-saved');
                    cy.get('@userDetails').dlTexts().should('matrixMatch', [
                        ['Role',                         subj.expect],
                        ['Reply notifications',          '✔'],
                        ['Moderator notifications',      ''],
                        ['Comment status notifications', '✔'],
                        ['Created',                      REGEXES.datetime],
                    ]);

                    // Login into a comment page and check the user's settings there
                    cy.testSiteLoginViaApi(subj.user, TEST_PATHS.noComment);
                    EmbedUtils.makeAliases({hasSortButtons: false});

                    // Open the Settings dialog
                    cy.get('@profileBar').find('button[title="Settings"]').click();
                    cy.get('@root').find('.comentario-dialog').as('settingsDialog').should('be.visible')
                        .contains('.comentario-dialog-header', 'User settings').should('be.visible');

                    // Check the user's settings
                    cy.get('@settingsDialog').find('#comentario-cb-notify-replies')       .should('be.checked');
                    cy.get('@settingsDialog').find('#comentario-cb-notify-moderator')     .should(subj.isModerator ? 'not.be.checked' : 'not.exist');
                    cy.get('@settingsDialog').find('#comentario-cb-notify-comment-status').should('be.checked');
                }));
        }));
});
