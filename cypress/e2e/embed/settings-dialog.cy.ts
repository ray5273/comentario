import { DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Settings dialog', () => {

    beforeEach(cy.backendReset);

    [
        {name: 'superuser',   user: USERS.root,           isModerator: true},
        {name: 'owner',       user: USERS.ace,            isModerator: true},
        {name: 'moderator',   user: USERS.king,           isModerator: true},
        {name: 'commenter',   user: USERS.commenterTwo,   isModerator: false},
        {name: 'read-only',   user: USERS.commenterThree, isModerator: false},
        {name: 'non-domain',  user: USERS.commenterOne,   isModerator: false},
    ]
        .forEach(test =>
            context(`as ${test.name} user`, () => {

                beforeEach(() => {
                    // Make the user logged-in
                    cy.testSiteLoginViaApi(test.user, TEST_PATHS.comments);
                    EmbedUtils.makeAliases();

                    // Open the Settings dialog
                    cy.get('@profileBar').find('button[title="Settings"]').as('btnSettings').click();
                    cy.get('@root').find('.comentario-dialog').as('settingsDialog').should('be.visible')
                        .contains('.comentario-dialog-header', 'User settings').should('be.visible');

                    // Make aliases
                    if (test.isModerator) {
                        cy.get('@settingsDialog').find('#comentario-cb-notify-moderator').as('cbNotifyModerator').should('be.visible').and('be.checked');
                    } else {
                        cy.get('@settingsDialog').find('#comentario-cb-notify-moderator').should('not.exist');
                    }
                    cy.get('@settingsDialog').find('#comentario-cb-notify-replies')       .as('cbNotifyReplies')      .should('be.visible').and('be.checked');
                    cy.get('@settingsDialog').find('#comentario-cb-notify-comment-status').as('cbNotifyCommentStatus').should('be.visible').and('be.checked');
                    cy.get('@settingsDialog').find('button[type=submit]')                 .as('btnSave')              .should('have.text', 'Save');

                    // Check Edit profile button
                    cy.get('@settingsDialog').contains('button', 'Edit Comentario profile').should('be.visible');
                });

                it('allows to update settings', () => {
                    // Change settings in the dialog
                    test.isModerator &&
                        cy.get('@cbNotifyModerator').clickLabel().should('not.be.checked');
                    cy.get('@cbNotifyReplies')      .clickLabel().should('not.be.checked');
                    cy.get('@cbNotifyCommentStatus').clickLabel().should('not.be.checked');

                    // Click "Save" and the dialog disappears
                    cy.intercept('POST', '/api/embed/auth/user').as('fetchPrincipal');
                    cy.get('@btnSave').click();
                    cy.get('@settingsDialog').should('not.exist');

                    // Wait for the principal to get re-fetched
                    cy.wait('@fetchPrincipal');

                    // Open the dialog again and check the settings
                    cy.get('@btnSettings').click();
                    cy.get('@settingsDialog').should('be.visible');
                    if (test.isModerator) {
                        cy.get('@cbNotifyModerator').should('not.be.checked');
                    }
                    cy.get('@cbNotifyReplies')      .should('not.be.checked');
                    cy.get('@cbNotifyCommentStatus').should('not.be.checked');

                    // Click on Escape and it's gone again
                    cy.get('@cbNotifyCommentStatus').type('{esc}');
                    cy.get('@settingsDialog').should('not.exist');

                    // Now change the settings directly via API and reload
                    cy.commenterUpdateSettingsViaApi(DOMAINS.localhost.id, true, true, true);
                    cy.reload();
                    EmbedUtils.makeAliases();

                    // Open the dialog again and check the settings
                    cy.get('@profileBar').find('button[title="Settings"]').click();
                    cy.get('@root').find('.comentario-dialog').as('settingsDialog').should('be.visible');
                    if (test.isModerator) {
                        cy.get('@settingsDialog').find('#comentario-cb-notify-moderator') .should('be.checked');
                    }
                    cy.get('@settingsDialog').find('#comentario-cb-notify-replies')       .should('be.checked');
                    cy.get('@settingsDialog').find('#comentario-cb-notify-comment-status').should('be.checked');
                });
            }));
});
