import { DOMAINS, PATHS, REGEXES, USERS } from '../../../../../support/cy-utils';

context('Comment Properties page', () => {

    const pagePath = PATHS.manage.domains.id(DOMAINS.localhost.id).comments + '/64fb0078-92c8-419d-98ec-7f22c270ef3a';
    const commentText = 'Captain, I\'ve plotted our course, and I suggest we take the eastern route. It\'ll take us a bit longer, but we\'ll avoid any bad weather.';

    const makeAliases = (buttons: boolean) => {
        cy.get('app-comment-properties')                     .as('commentProps');
        cy.get('@commentProps').find('#comment-detail-table').as('commentDetails');
        cy.get('@commentProps').find('.comment-text')        .as('commentText');
        if (buttons) {
            cy.get('@commentProps').contains('button', 'Approve').as('btnApprove').should('be.visible').and('be.enabled');
            cy.get('@commentProps').contains('button', 'Reject') .as('btnReject') .should('be.visible').and('be.enabled');
            cy.get('@commentProps').contains('button', 'Delete') .as('btnDelete') .should('be.visible').and('be.enabled');
        }
    };

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        [
            {name: 'superuser',  user: USERS.root,           dest: 'back'},
            {name: 'owner',      user: USERS.ace,            dest: 'back'},
            {name: 'moderator',  user: USERS.king,           dest: 'back'},
            {name: 'commenter',  user: USERS.commenterTwo,   dest: 'back'},
            {name: 'readonly',   user: USERS.commenterThree, dest: 'back'},
            {name: 'non-domain', user: USERS.commenterOne,   dest: 'to Domain Manager', redir: PATHS.manage.domains},
        ]
            .forEach(test =>
                it(`redirects ${test.name} user to login and ${test.dest}`, () =>
                    cy.verifyRedirectsAfterLogin(pagePath, test.user, test.redir)));
    });

    it('stays on the page after reload', () =>
        cy.verifyStayOnReload(pagePath, USERS.commenterTwo));

    context('shows properties', () => {

        [
            {name: 'superuser', user: USERS.root},
            {name: 'owner',     user: USERS.ace},
            {name: 'moderator', user: USERS.king},
        ]
            .forEach(test =>
                it(`for ${test.name} user`, () => {
                    cy.loginViaApi(test.user, pagePath);
                    makeAliases(true);

                    const checkBtns = (approved: boolean, rejected: boolean, deleted: boolean) => {
                        cy.get('@btnApprove').hasClass('active').its(0).should('eq', approved);
                        cy.get('@btnReject') .hasClass('active').its(0).should('eq', rejected);
                        cy.get('@btnDelete') .hasClass('active').its(0).should('eq', deleted);
                    };

                    // Check properties
                    cy.get('@commentDetails').dlTexts().should('matrixMatch', [
                        ['Permalink',      'http://localhost:8000/#comentario-64fb0078-92c8-419d-98ec-7f22c270ef3a'],
                        ['Parent comment', '788c0b17-a922-4c2d-816b-98def34a0008'],
                        ['Domain page',    '/'],
                        ['Status',         'Approved'],
                        ['Score',          '4'],
                        ['Sticky',         ''],
                        ['Created',        REGEXES.datetime],
                        // Moderator isn't allowed to see the email
                        ['Created by',     test.name === 'moderator' ? 'C\nCommenter Two' : 'C\nCommenter Two (two@blog.com)'],
                    ]);

                    // Check buttons
                    checkBtns(true, false, false);

                    // Check text
                    cy.get('@commentText').should('be.visible').and('have.text', commentText);

                    // Unapprove the comment
                    cy.get('@btnApprove').click();
                    checkBtns(false, false, false);
                    cy.get('@commentDetails').contains('dt', 'Status').next().should('have.text', 'Pending');

                    // Re-approve the comment
                    cy.get('@btnApprove').click();
                    checkBtns(true, false, false);
                    cy.get('@commentDetails').contains('dt', 'Status').next().should('have.text', 'Approved');

                    // Reject the comment
                    cy.get('@btnReject').click();
                    checkBtns(false, true, false);
                    cy.get('@commentDetails').contains('dt', 'Status').next().should('have.text', 'Rejected');

                    // Unreject the comment
                    cy.get('@btnReject').click();
                    checkBtns(false, false, false);
                    cy.get('@commentDetails').contains('dt', 'Status').next().should('have.text', 'Pending');

                    // Delete the comment - all buttons and the text disappear
                    cy.get('@btnDelete').click();
                    cy.confirmationDialog('Are you sure you want to delete this comment?').dlgButtonClick('Delete comment');
                    cy.get('@btnApprove') .should('not.exist');
                    cy.get('@btnReject')  .should('not.exist');
                    cy.get('@btnDelete')  .should('not.exist');
                    cy.get('@commentText').should('not.exist');
                    cy.get('@commentDetails').contains('dt', 'Status').next().should('have.text', 'Deleted');
                }));

        [
            {name: 'commenter', user: USERS.commenterTwo},
            {name: 'readonly',  user: USERS.commenterThree},
        ]
            .forEach(test =>
                it(`for ${test.name} user`, () => {
                    cy.loginViaApi(test.user, pagePath);
                    makeAliases(false);

                    // Check properties
                    cy.get('@commentDetails').dlTexts().should('matrixMatch', [
                        ['Permalink',      'http://localhost:8000/#comentario-64fb0078-92c8-419d-98ec-7f22c270ef3a'],
                        ['Parent comment', '788c0b17-a922-4c2d-816b-98def34a0008'],
                        ['Domain page',    '/'],
                        ['Status',         'Approved'],
                        ['Score',          '4'],
                        ['Sticky',         ''],
                        ['Created',        REGEXES.datetime],
                        ['Created by',     'C\nCommenter Two'],
                    ]);

                    // Check text
                    cy.get('@commentText').should('be.visible').and('have.text', commentText);
                }));
    });
});
