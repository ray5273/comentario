import { PATHS, REGEXES, USERS } from '../../../../support/cy-utils';

context('User Edit page', () => {

    const pagePathKing = PATHS.manage.users.id(USERS.king.id).edit;
    const pagePathRoot = PATHS.manage.users.id(USERS.root.id).edit;
    const propsPagePathKing = PATHS.manage.users.id(USERS.king.id).props;

    const makeAliases = () => {
        cy.get('app-user-edit').as('userEdit');

        // Check heading
        cy.get('@userEdit').find('h1').should('have.text', 'Edit user').and('be.visible');

        // Form controls
        cy.get('@userEdit').find('#name')          .as('name');
        cy.get('@userEdit').find('#email')         .as('email');
        cy.get('@userEdit').find('#password input').as('password').should('have.value', '').and('have.attr', 'placeholder', '(unchanged)');
        cy.get('@userEdit').find('#website-url')   .as('websiteUrl');
        cy.get('@userEdit').find('#remarks')       .as('remarks');
        cy.get('@userEdit').find('#confirmed')     .as('confirmed');
        cy.get('@userEdit').find('#superuser')     .as('superuser');

        // Buttons
        cy.get('@userEdit').contains('.form-footer a', 'Cancel')    .as('btnCancel');
        cy.get('@userEdit').find('.form-footer button[type=submit]').as('btnSubmit');
    };

    //------------------------------------------------------------------------------------------------------------------

    beforeEach(cy.backendReset);

    context('unauthenticated user', () => {

        it(`redirects superuser to login and back`, () =>
            cy.verifyRedirectsAfterLogin(pagePathKing, USERS.root));

        it(`redirects regular user to login and to Dashboard`, () =>
            cy.verifyRedirectsAfterLogin(pagePathKing, USERS.ace, PATHS.manage.dashboard));
    });

    it('stays on the page after reload', () => cy.verifyStayOnReload(pagePathKing, USERS.root));

    it('validates input', () => {
        cy.loginViaApi(USERS.root, pagePathKing);
        makeAliases();

        // Remove name and submit to engage validation
        cy.get('@name').clear().blur();
        cy.get('@btnSubmit').click();
        cy.isAt(pagePathKing);

        // Verify validations
        cy.get('@name')      .verifyTextInputValidation(2, 63, true, 'Please enter a valid name.');
        cy.get('@email')     .verifyEmailInputValidation();
        cy.get('@password')  .verifyPasswordInputValidation({required: false, strong: true});
        cy.get('@websiteUrl').verifyUrlInputValidation(false, false, 'Please enter a valid URL.');
        cy.get('@remarks')   .verifyTextInputValidation(0, 4096, false, 'Please enter a valid value.');

        // Test cancelling: we return to user properties
        cy.get('@btnCancel').click();
        cy.isAt(propsPagePathKing);
        cy.noToast();
    });

    context('edit properties', () => {

        it('allows to edit the self-user', () => {
            cy.loginViaApi(USERS.root, pagePathRoot);
            makeAliases();
            cy.get('@name')      .should('have.value', USERS.root.name);
            cy.get('@email')     .should('have.value', USERS.root.email);
            cy.get('@websiteUrl').should('have.value', 'https://comentario.app/');
            cy.get('@remarks')   .should('have.value', '');
            cy.get('@confirmed') .should('be.checked').and('be.disabled');
            cy.get('@superuser') .should('be.checked').and('be.disabled');

            // Update the values
            cy.get('@name')      .setValue('I am the root!');
            cy.get('@email')     .setValue('super@example.com');
            cy.get('@websiteUrl').clear();
            cy.get('@remarks')   .setValue('Twinkle twinkle little star');

            // Submit and get a success toast
            cy.get('@btnSubmit').click();
            cy.isAt(PATHS.manage.users.id(USERS.root.id).props);
            cy.toastCheckAndClose('data-saved');

            // Verify user details
            cy.get('app-user-properties #user-details').dlTexts().should('matrixMatch', [
                ['ID',                   USERS.root.id + 'YOU'],
                ['Name',                 'I am the root!'],
                ['Email',                'super@example.com'],
                ['Language',             'en'],
                ['Remarks',              'Twinkle twinkle little star'],
                ['Confirmed',            REGEXES.checkDatetime],
                ['Superuser',            '✔'],
                ['Created',              REGEXES.datetime],
                ['Last password change', REGEXES.datetime],
                ['Last login',           REGEXES.datetime],
                ['Signup IP',            '12.13.14.15'],
                ['Signup country',       'KZ — Kazakhstan'],
            ]);
        });

        context('allows to edit a local user', () => {

            beforeEach(() => {
                // Open the user's edit page
                cy.loginViaApi(USERS.root, pagePathKing);
                makeAliases();

                // Verify the initial values
                cy.get('@name')      .should('have.value', USERS.king.name);
                cy.get('@email')     .should('have.value', USERS.king.email);
                cy.get('@websiteUrl').should('have.value', '');
                cy.get('@remarks')   .should('have.value', 'Almighty king');
                cy.get('@confirmed') .should('be.checked')    .and('be.enabled');
                cy.get('@superuser') .should('not.be.checked').and('be.enabled');
            });

            it('keeping all values', () => {
                // Submit without changing anything and get a success toast
                cy.get('@btnSubmit').click();
                cy.isAt(propsPagePathKing);
                cy.toastCheckAndClose('data-saved');

                // Verify user details
                cy.get('app-user-properties #user-details').dlTexts().should('matrixMatch', [
                    ['ID',                   USERS.king.id],
                    ['Name',                 USERS.king.name],
                    ['Email',                USERS.king.email],
                    ['Language',             'en'],
                    ['Remarks',              'Almighty king'],
                    ['Confirmed',            REGEXES.checkDatetime],
                    ['Created',              REGEXES.datetime],
                    ['Last password change', REGEXES.datetime],
                    ['Last login',           '(never)'],
                ]);
            });

            it('changing values', () => {
                // Update the values
                cy.get('@name')      .setValue('King Lear');
                cy.get('@email')     .setValue('lear@example.com');
                cy.get('@websiteUrl').setValue('https://en.wikipedia.org/wiki/King_Lear');
                cy.get('@remarks')   .setValue('Elderly and wanting to retire');
                cy.get('@confirmed') .click();
                cy.get('@superuser') .click();

                // Submit and get a success toast
                cy.get('@btnSubmit').click();
                cy.isAt(propsPagePathKing);
                cy.toastCheckAndClose('data-saved');

                // Verify user details
                cy.get('app-user-properties #user-details').dlTexts().should('matrixMatch', [
                    ['ID',                   USERS.king.id],
                    ['Name',                 'King Lear'],
                    ['Email',                'lear@example.com'],
                    ['Language',             'en'],
                    ['Remarks',              'Elderly and wanting to retire'],
                    ['Website URL',          'https://en.wikipedia.org/wiki/King_Lear'],
                    ['Superuser',            '✔'],
                    ['Created',              REGEXES.datetime],
                    ['Last password change', REGEXES.datetime],
                    ['Last login',           '(never)'],
                ]);
            });
        });

        context('allows to edit a federated user', () => {

            beforeEach(() => {
                // Open the user's edit page
                cy.loginViaApi(USERS.root, PATHS.manage.users.id(USERS.facebookUser.id).edit);
                makeAliases();

                // Verify the initial values
                cy.get('@name')      .should('have.value', USERS.facebookUser.name) .and('be.disabled');
                cy.get('@email')     .should('have.value', USERS.facebookUser.email).and('be.disabled');
                cy.get('@websiteUrl').should('have.value', '');
                cy.get('@remarks')   .should('have.value', '');
                cy.get('@confirmed') .should('be.checked')    .and('be.enabled');
                cy.get('@superuser') .should('not.be.checked').and('be.enabled');
            });

            it('keeping values', () => {
                // Submit without changing anything and get a success toast
                cy.get('@btnSubmit').click();
                cy.isAt(PATHS.manage.users.id(USERS.facebookUser.id).props);
                cy.toastCheckAndClose('data-saved');

                // Verify user details
                cy.get('app-user-properties #user-details').dlTexts().should('matrixMatch', [
                    ['ID',                   USERS.facebookUser.id],
                    ['Federated user',       'facebook/30f5efad'],
                    ['Name',                 USERS.facebookUser.name],
                    ['Email',                USERS.facebookUser.email],
                    ['Language',             'en'],
                    ['Confirmed',            REGEXES.checkDatetime],
                    ['Created',              REGEXES.datetime],
                    ['Last password change', REGEXES.datetime],
                    ['Last login',           '(never)'],
                ]);
            });

            it('changing values', () => {
                // Update the values
                cy.get('@websiteUrl').setValue('https://facebook.com');
                cy.get('@remarks')   .setValue('Internet troll');
                cy.get('@confirmed') .click();
                cy.get('@superuser') .click();

                // Submit and get a success toast
                cy.get('@btnSubmit').click();
                cy.isAt(PATHS.manage.users.id(USERS.facebookUser.id).props);
                cy.toastCheckAndClose('data-saved');

                // Verify user details
                cy.get('app-user-properties #user-details').dlTexts().should('matrixMatch', [
                    ['ID',                   USERS.facebookUser.id],
                    ['Federated user',       'facebook/30f5efad'],
                    ['Name',                 USERS.facebookUser.name],
                    ['Email',                USERS.facebookUser.email],
                    ['Language',             'en'],
                    ['Remarks',              'Internet troll'],
                    ['Website URL',          'https://facebook.com'],
                    ['Superuser',            '✔'],
                    ['Created',              REGEXES.datetime],
                    ['Last password change', REGEXES.datetime],
                    ['Last login',           '(never)'],
                ]);
            });
        });

        it('disallows reusing an existing email', () => {
            cy.loginViaApi(USERS.root, pagePathKing);
            makeAliases();
            cy.get('@email').setValue(USERS.ace.email);

            // Submit and get an error toast
            cy.get('@btnSubmit').click();
            cy.isAt(pagePathKing);
            cy.toastCheckAndClose('email-already-exists');
        });

        it('disallows editing Anonymous', () => {
            // It isn't possible to click "Edit" on Anonymous' properties page, but we can approach their Edit user page
            // directly
            const path = PATHS.manage.users.id(USERS.anonymous.id).edit;
            cy.loginViaApi(USERS.root, path);
            makeAliases();
            cy.get('@email').setValue('test@example.com');
            cy.get('@btnSubmit').click();
            cy.isAt(path);
            cy.toastCheckAndClose('immutable-account');
        });
    });
});
