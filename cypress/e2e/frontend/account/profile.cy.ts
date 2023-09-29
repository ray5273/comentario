import { PATHS, USERS } from '../../../support/cy-utils';

context('Profile', () => {

    beforeEach(cy.backendReset);

    it('redirects user to login and back to Profile', () => {
        cy.visit(PATHS.manage.account.profile);
        cy.isAt(PATHS.auth.login);

        // Login and get redirected to Profile
        cy.login(USERS.commenterOne, {goTo: false, redirectPath: PATHS.manage.account.profile});
    });

    context('authenticated user', () => {

        beforeEach(() => {
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.account.profile);
            cy.isAt(PATHS.manage.account.profile);

            // Aliases
            cy.get('#profile-form')                       .as('form');
            cy.get('#email')                              .as('email');
            cy.get('#name')                               .as('name');
            cy.get('#cur-password input')                 .as('curPwd');
            cy.get('#new-password input')                 .as('newPwd');
            cy.get('#current-user-id')                    .as('userId');
            // -- Avatar
            cy.get('#user-avatar')                        .as('avatar');
            cy.get('#user-avatar-picture')                .as('avatarPic');
            cy.get('#user-avatar-file')                   .as('avatarFile');
            cy.get('@avatar').contains('button', 'Change').as('avatarChange');
            cy.get('@avatar').contains('button', 'Remove').as('avatarRemove');
            // -- Submit
            cy.get('button[type=submit]')                 .as('submit');
            // -- Danger zone
            cy.contains('button', 'Danger zone').as('dzToggle');
            cy.get('#danger-zone-container')    .as('dzContainer');
        });

        it('stays on the page after reload', () => {
            cy.reload();
            cy.isAt(PATHS.manage.account.profile);
        });

        it('has all necessary controls', () => {
            // Check page content
            cy.get('h1').should('have.text', 'My profile');

            // Check form content
            cy.get('@form').contains('label', 'Email');
            cy.get('@form').contains('label', 'Name');
            cy.get('@form').contains('label', 'Current password');
            cy.get('@form').contains('label', 'New password');
            cy.get('@form').contains('label', 'User ID');
            cy.get('@email') .should('be.visible').should('be.disabled').should('have.value', USERS.commenterOne.email);
            cy.get('@name')  .should('be.visible').should('be.enabled') .should('have.value', USERS.commenterOne.name);
            cy.get('@curPwd').should('be.visible').should('be.enabled') .should('have.value', '').should('have.attr', 'placeholder', '(unchanged)');
            cy.get('@newPwd').should('be.visible').should('be.enabled') .should('have.value', '').should('have.attr', 'placeholder', '(unchanged)');
            cy.get('@userId').should('be.visible').should('be.disabled').should('have.value', USERS.commenterOne.id);
            // -- Avatar
            cy.get('@avatarPic')   .should('be.visible').should('have.text', 'C');
            cy.get('@avatarFile')  .should('exist').should('not.be.visible').should('be.enabled');
            cy.get('@avatarChange').should('be.visible').should('be.enabled');
            cy.get('@avatarRemove').should('be.visible').should('be.enabled');
            // -- Submit button is disabled when no changes
            cy.get('@submit').should('be.visible').should('be.disabled').should('have.text', 'Save');

            // Check danger zone
            cy.get('@dzToggle')   .should('be.visible');
            cy.get('@dzContainer').should('not.be.visible');
            cy.get('@dzToggle').click();
            cy.get('@dzContainer').should('be.visible');
            cy.get('@dzToggle').click();
            cy.get('@dzContainer').should('not.be.visible');
        });

        it('validates input', () => {
            // Name. Clear and try to submit to engage validation
            cy.get('@name').clear();
            cy.get('@submit').focus().should('be.enabled').click();
            cy.get('@name').verifyUserNameInputValidation();

            // Passwords
            cy.get('@curPwd').verifyPasswordInputValidation({required: false, strong: false});
            cy.get('@newPwd').verifyPasswordInputValidation({required: false, strong: true});
        });

        it('allows to change profile', () => {
            // Update name only
            cy.get('@name').setValue('Sponge Bob');
            cy.get('@submit').click();
            cy.toastCheckAndClose('data-saved');

            // Name and avatar letter in sidebar get immediately updated
            cy.get('app-control-center #sidebarProfile').should('have.text', 'S' + 'Sponge Bob');

            // Can still login with old password, data is the same after reload
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.account.profile);
            cy.get('@name').should('have.value', 'Sponge Bob');
            cy.get('app-control-center #sidebarProfile').should('have.text', 'S' + 'Sponge Bob');

            // Try to change the password, giving a wrong current one
            const newPwd = 'Passw0rdy14!';
            cy.get('@curPwd').setValue(USERS.commenterOne.password + '!');
            cy.get('@newPwd').setValue(newPwd);
            cy.get('@submit').click();
            cy.toastCheckAndClose('wrong-cur-password');

            // The password is unchanged
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.account.profile);

            // Change the password
            cy.get('@curPwd').setValue(USERS.commenterOne.password);
            cy.get('@newPwd').setValue(newPwd);
            cy.get('@submit').click();
            cy.toastCheckAndClose('data-saved');

            // Login with the new password
            cy.loginViaApi(USERS.commenterOne.withPassword(newPwd), PATHS.manage.account.profile);
        });

        it('allows to change avatar', () => {
            // Change avatar by uploading a PNG image
            cy.get('@avatarFile').selectFile('cypress/fixtures/avatar.png', {force: true});
            cy.get('@avatarChange').click();

            // The avatar letter is replaced with a picture
            cy.get('@avatarPic').should('have.text', '');

            // After saving it's also updated in the sidebar
            cy.get('@submit').click();
            cy.toastCheckAndClose('data-saved');
            cy.get('app-control-center #sidebarProfile').should('have.text', 'Commenter One');

            // Remove the customised avatar, the letter is back
            cy.get('@avatarRemove').click();
            cy.get('@avatarPic').should('have.text', 'C');

            // After saving it's also updated in the sidebar
            cy.get('@submit').click();
            cy.toastCheckAndClose('data-saved');
            cy.get('app-control-center #sidebarProfile').should('have.text', 'C' + 'Commenter One');
        });

        it('allows to delete account', () => {
            // Expand the danger zone and click on Delete my account
            cy.get('@dzToggle').click();
            cy.get('@dzContainer').contains('button', 'Delete my account').as('delBtn').click();

            // Confirmation dialog appears. Cancel it and it's gone
            cy.confirmationDialog(/You will lose your access to Comentario/).as('dlg');
            cy.get('@dlg').contains('button', 'Delete my account').should('be.disabled');
            cy.get('@dlg').dlgCancel().should('not.exist');

            // Click the Delete button again and confirm
            cy.get('@delBtn').click();
            cy.confirmationDialog()
                .find('#agreed-del-account').should('not.be.checked')
                .clickLabel().should('be.checked');
            cy.confirmationDialog().dlgButtonClick('Delete my account');

            // We're back to the home page, and there's a success toast
            cy.isAt(PATHS.home);
            cy.toastCheckAndClose('account-deleted');

            // We're logged off
            cy.isLoggedIn(false);

            // It's not possible to log in anymore
            cy.login(USERS.commenterOne, {succeeds: false, errToast: 'invalid-credentials'});
        });
    });

    context('doesn\'t allow deletion', () => {

        const loginAndTryDelete = (creds: Cypress.Credentials) => {
            cy.loginViaApi(creds, PATHS.manage.account.profile);
            cy.contains('button', 'Danger zone').click();
            cy.contains('#danger-zone-container button', 'Delete my account').click();
            cy.confirmationDialog().find('#agreed-del-account').clickLabel();
            cy.confirmationDialog().dlgButtonClick('Delete my account');

            // Deletion fails, we're still on the profile page
            cy.isAt(PATHS.manage.account.profile);
            cy.isLoggedIn();
        };

        it('of the only superuser', () => {
            loginAndTryDelete(USERS.root);
            cy.toastCheckAndClose('deleting-last-superuser');

            // Login still works
            cy.loginViaApi(USERS.root, PATHS.manage.account.profile);
        });

        it('of the last domain owner', () => {
            loginAndTryDelete(USERS.king);
            cy.toastCheckAndClose('deleting-last-owner', '(factor.example.com)');

            // Login still works
            cy.loginViaApi(USERS.king, PATHS.manage.account.profile);
        });
    });
});
