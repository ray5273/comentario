import { DOMAINS, PATHS, TEST_PATHS, USERS } from '../../../support/cy-utils';

context('Profile', () => {

    const makeAliases = () => {
        // Profile form
        cy.get('#profile-form')      .as('form');
        cy.get('#current-user-id')   .as('userId');
        cy.get('#email')             .as('email');
        cy.get('#name')              .as('name');
        cy.get('#website-url')       .as('websiteUrl');
        cy.get('#cur-password input').as('curPwd');
        cy.get('#new-password input').as('newPwd');
        // Avatar
        cy.get('#user-avatar')                                        .as('avatar');
        cy.get('#user-avatar-picture')                                .as('avatarPic');
        cy.get('#user-avatar-file')                                   .as('avatarFile');
        cy.get('@avatar').contains('button', 'Upload')                .as('avatarUpload');
        cy.get('@avatar').contains('button', 'Remove')                .as('avatarRemove');
        cy.get('@avatar').contains('button', 'Download from Gravatar').as('avatarGravatar');
        // Submit
        cy.get('button[type=submit]').as('submit');
        // Danger zone
        cy.contains('button', 'Danger zone').as('dzToggle');
        cy.get('#danger-zone-container')    .as('dzContainer');
    };

    const makeConfDialogAliases = () => {
        cy.confirmationDialog(/You will lose your access to Comentario/).as('dlg');
        cy.get('@dlg').contains('button', 'Delete my account').as('delConfirm')   .should('be.disabled');
        cy.get('@dlg').find('#del-comments-del-account')      .as('delComments')  .should('not.be.checked');
        cy.get('@dlg').find('#purge-comments-del-account')    .as('purgeComments').should('not.be.checked');
        cy.get('@dlg').find('#agreed-del-account')            .as('agreed')       .should('not.be.checked');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    it('redirects user to login and back', () => cy.verifyRedirectsAfterLogin(PATHS.manage.account.profile, USERS.commenterOne));

    context('commenter user', () => {

        beforeEach(() => {
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.account.profile);
            cy.isAt(PATHS.manage.account.profile);
            makeAliases();
        });

        it('stays on the page after reload', () => cy.verifyStayOnReload(PATHS.manage.account.profile, USERS.commenterOne));

        it('has all necessary controls', () => {
            // Check page content
            cy.get('h1').should('have.text', 'My profile');

            // Check form content
            cy.get('@form').contains('label', 'User ID');
            cy.get('@form').contains('label', 'Email');
            cy.get('@form').contains('label', 'Name');
            cy.get('@form').contains('label', 'Website URL');
            cy.get('@form').contains('label', 'Current password');
            cy.get('@form').contains('label', 'New password');
            cy.get('@userId')    .should('be.visible').and('be.disabled').and('have.value', USERS.commenterOne.id);
            cy.get('@email')     .should('be.visible').and('be.disabled').and('have.value', USERS.commenterOne.email);
            cy.get('@name')      .should('be.visible').and('be.enabled') .and('have.value', USERS.commenterOne.name);
            cy.get('@websiteUrl').should('be.visible').and('be.enabled') .and('have.value', '');
            cy.get('@curPwd')    .should('be.visible').and('be.enabled') .and('have.value', '').and('have.attr', 'placeholder', '(unchanged)');
            cy.get('@newPwd')    .should('be.visible').and('be.enabled') .and('have.value', '').and('have.attr', 'placeholder', '(unchanged)');
            // -- Avatar
            cy.get('@avatarPic')     .should('be.visible').and('have.text', 'C');
            cy.get('@avatarFile')    .should('exist')     .and('not.be.visible').and('be.enabled');
            cy.get('@avatarUpload')  .should('be.visible').and('be.enabled');
            cy.get('@avatarRemove')  .should('be.visible').and('be.enabled');
            cy.get('@avatarGravatar').should('be.visible').and('be.enabled');
            // -- Submit button is disabled when no changes
            cy.get('@submit').should('be.visible').and('be.disabled').and('have.text', 'Save');

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
            cy.get('@name').verifyTextInputValidation(2, 63, true, 'Please enter a valid name.');

            // Website URL
            cy.get('@websiteUrl').verifyUrlInputValidation(false, false, 'Please enter a valid URL.');

            // Passwords
            cy.get('@curPwd').verifyPasswordInputValidation({required: false, strong: false});
            cy.get('@newPwd').verifyPasswordInputValidation({required: false, strong: true});
        });

        it('allows to change profile', () => {
            // Update name and website
            cy.get('@name')      .setValue('Sponge Bob');
            cy.get('@websiteUrl').setValue('https://spongebob.se');
            cy.get('@submit').click();
            cy.toastCheckAndClose('data-saved');

            // Name and avatar letter in sidebar get immediately updated
            cy.get('app-control-center #sidebarProfile').should('have.text', 'S' + 'Sponge Bob');

            // Can still login with old password, data is the same after reload
            cy.loginViaApi(USERS.commenterOne, PATHS.manage.account.profile);
            cy.get('@name')      .should('have.value', 'Sponge Bob');
            cy.get('@websiteUrl').should('have.value', 'https://spongebob.se');
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
            cy.get('@avatarUpload').click();

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

        context('Gravatar picture download', () => {

            it('allows to set avatar', () => {
                // Mock the response as we don't want to depend on an external service
                cy.intercept('POST', '/api/user/avatar/gravatar', {statusCode: 204}).as('apiGravatar');

                // Imitate the user now having an avatar
                cy.intercept('GET', '/api/user', req => req.continue(res => {
                    res.body.hasAvatar = true;
                }));

                // Also mock the avatar response from the API
                cy.intercept('GET', `/api/users/${USERS.commenterOne.id}/avatar?**`, {fixture: 'avatar.png'}).as('apiGetAvatar');

                // Click on Download from Gravatar
                cy.get('@avatarGravatar').click();
                cy.wait('@apiGravatar');
                cy.wait('@apiGetAvatar');

                // No toast is shown
                cy.noToast();

                // Submit isn't available since there's no change
                cy.get('@submit').should('be.disabled');

                // The avatar letter is replaced with a picture, also in the sidebar
                cy.get('@avatarPic').should('have.text', '');
                cy.get('app-control-center #sidebarProfile').should('have.text', 'Commenter One');
            });

            it('handles Gravatar failure', () => {
                // Imitate API failure
                cy.intercept('POST', '/api/user/avatar/gravatar', {statusCode: 502, body: {id: 'resource-fetch-failed'}}).as('apiGravatar');

                // Click on Download from Gravatar
                cy.get('@avatarGravatar').click();
                cy.wait('@apiGravatar');

                // There's an error toast
                cy.toastCheckAndClose('resource-fetch-failed');

                // Avatar is unchanged
                cy.get('@avatarPic').should('have.text', 'C');
                cy.get('@submit').should('be.disabled');
            });
        });
    });

    context('account deletion', () => {

        const loginAndDelete = (creds: Cypress.Credentials, delComments: boolean, purge: boolean, succeeds: boolean) => {
            cy.loginViaApi(creds, PATHS.manage.account.profile);
            makeAliases();

            // Expand the danger zone and click on Delete my account
            cy.get('@dzToggle').click();
            cy.get('@dzContainer').contains('button', 'Delete my account').as('delBtn').click();

            // Confirmation dialog appears. Cancel it and it's gone
            makeConfDialogAliases();
            cy.get('@dlg').dlgCancel().should('not.exist');

            // Click the Delete button again and confirm
            cy.get('@delBtn').click();
            makeConfDialogAliases();
            if (delComments) {
                cy.get('@delComments').clickLabel().should('be.checked');
                if (purge) {
                    cy.get('@purgeComments').clickLabel().should('be.checked');
                }
            }
            cy.get('@agreed').clickLabel().should('be.checked');
            cy.get('@delConfirm').click();

            // If the profile deletion is supposed to succeed
            if (succeeds) {
                // We're back to the home page, and there's a success toast
                cy.isAt(PATHS.home);
                // We can't rely on the number of deleted comments (reported in details) as it varies among databases
                cy.toastCheckAndClose('account-deleted');

                // We're logged off
                cy.isLoggedIn(false);

                // It's not possible to log in anymore
                cy.login(creds, {succeeds: false, errToast: 'invalid-credentials'});

            } else {
                // Deletion fails, we're still on the profile page
                cy.isAt(PATHS.manage.account.profile);
                cy.isLoggedIn();
            }
        };

        it('allows deletion, keeping comments', () => {
            loginAndDelete(USERS.commenterTwo, false, false, true);
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
                      - author: '[Deleted User]'
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
                `,
            );
        });

        it('allows deletion, deleting comments', () => {
            loginAndDelete(USERS.queen, true, false, true);
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
                      - author: '[Deleted User]'
                        html: '(deleted)'
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
                      - author: '[Deleted User]'
                        html: '(deleted)'
                        children:
                        - author: Captain Ace
                          html: <p>Let's hope it doesn't come to that, cook. But it's good to know we have you on our side.</p><p>Alright, everyone, let's get to work. We've got a long journey ahead of us!</p>
                `,
            );
        });

        it('allows deletion, purging comments', () => {
            loginAndDelete(USERS.queen, true, true, true);
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
                `,
            );
        });

        context('isn\'t allowed', () => {

            it('for the only superuser', () => {
                loginAndDelete(USERS.root, false, false, false);
                cy.toastCheckAndClose('deleting-last-superuser');

                // Login still works
                cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.ace.id).edit);

                // Appoint another superuser
                cy.get('app-user-edit #superuser').clickLabel();
                cy.get('app-user-edit button[type=submit]').click();
                cy.toastCheckAndClose('data-saved');

                // Now the deletion succeeds
                loginAndDelete(USERS.root, false, false, true);
            });

            it('for the last domain owner', () => {
                loginAndDelete(USERS.ace, false, false, false);
                cy.toastCheckAndClose('deleting-last-owner', `(${DOMAINS.localhost.host})`);

                // Login still works
                cy.loginViaApi(USERS.ace, PATHS.manage.domains.id(DOMAINS.localhost.id).users + `/${USERS.queen.id}/edit`);

                // Appoint another domain owner
                cy.get('app-domain-user-edit #role-owner').clickLabel();
                cy.get('app-domain-user-edit button[type=submit]').click();
                cy.toastCheckAndClose('data-saved');

                // Now the deletion succeeds
                loginAndDelete(USERS.ace, true, true, true);

                // No comment on the test site homepage anymore
                cy.testSiteVisit(TEST_PATHS.home);
                cy.commentTree().should('be.empty');
            });
        });
    });
});
