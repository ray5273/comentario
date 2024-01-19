import JQueryWithSelector = Cypress.JQueryWithSelector;
import { PATHS } from './cy-utils';

// @ts-ignore
const { config, $ } = Cypress;
const baseUrl = config('baseUrl');

/** The base URL for the test site. */
const testSiteUrl = Cypress.env('TEST_SITE_URL') || 'http://localhost:8000/';
const testSiteHost = new URL(testSiteUrl).host;

const commentDeepMap = (c: Cypress.Comment, props: (keyof Cypress.Comment)[]) => {
    const x: any = {};
    props.forEach(p => x[p] = c[p]);
    if (c.children?.length) {
        x.children = c.children.map(child => commentDeepMap(child, props));
    }
    return x;
};

const getChildComments = (root: Element): Cypress.Comment[] =>
    // Query comment cards
    Array.from(root.children)
        // Filter comment cards
        .filter(c => c.classList.contains('comentario-card'))
        // Turn the card into a comment
        .map(c => $(c).find('> .comentario-card-expand-body'))
        .map($body => {
            const $self    = $body.find('> .comentario-card-self');
            const $header  = $self.find('> .comentario-card-header');
            const $toolbar = $self.find('> .comentario-toolbar');
            const sc       = $toolbar.find('.comentario-score').html();
            const c: Cypress.Comment = {
                id:        $self.attr('id')?.replace('comentario-', ''),
                html:      $self.find(' > .comentario-card-body').html(),
                author:    $header.find('.comentario-name').html(),
                score:     sc ? Number(sc) : null,
                upvoted:   $toolbar.find('.comentario-btn[title=Upvote]')  .hasClass('comentario-upvoted'),
                downvoted: $toolbar.find('.comentario-btn[title=Downvote]').hasClass('comentario-downvoted'),
                sticky:    !!$toolbar.find('.comentario-is-sticky').length,
                pending:   $self.hasClass('comentario-pending'),
            };

            // Recurse children, if any
            const $children = $body.find('> .comentario-card-children');
            if ($children.length) {
                const ch = getChildComments($children[0]);
                if (ch.length) {
                    c.children = ch;
                }
            }
            return c;
        });

Cypress.Commands.addQuery(
    'commentTree',
    function commentTree(...properties: (keyof Cypress.Comment)[]) {
        return (element?: JQueryWithSelector) => {
            // Collect the comments
            let cc = (element ?? $('comentario-comments')).first()
                // Find the comment container
                .find('.comentario-comments')
                // Recurse into child comments
                .map((_, c) => getChildComments(c))
                // Unwrap the Comment[]
                .get();
            // Map properties, if needed
            return properties.length ? cc.map(c => commentDeepMap(c, properties)) : cc;
        };
    });

Cypress.Commands.add('isAt', (expected: string | RegExp | Cypress.IsAtObjectWithUnderscore, options?: Cypress.IsAtOptions) => cy.url().should((url) => {
    // Strip off any parameters before comparing
    url = url.replace(/;.*$/, '');

    // Strip off any query params, if needed
    if (options?.ignoreQuery) {
        url = url.replace(/\?.*$/, '');
    }

    // The URL must begin with the base URL
    expect(url.startsWith(options?.testSite ? testSiteUrl : baseUrl)).to.be.true;

    // Check if we need to "deunderscorise" the expected
    if (typeof expected === 'object' && '_' in expected) {
        expected = expected._;
    }

    // Compare the path part
    const actual = url.substring(baseUrl.length);
    if (expected instanceof RegExp) {
        expect(actual).to.match(expected);
    } else {
        expect(actual).eq(expected);
    }
}));

Cypress.Commands.add(
    'isLoggedIn',
    {prevSubject: false},
    (loggedIn?: boolean) => {
        if (loggedIn ?? true) {
            cy.contains('app-footer a', 'Dashboard').should('be.visible');
            cy.contains('app-footer a', 'Sign in')  .should('not.exist');
        } else {
            cy.contains('app-navbar a', 'Sign in')  .should('be.visible');
            cy.contains('app-footer a', 'Dashboard').should('not.exist');
            cy.contains('app-footer a', 'Sign in'  ).should('be.visible');
        }
    });

Cypress.Commands.add(
    'setValue',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, s: string) =>
        cy.wrap(element).invoke('val', s).trigger('input').trigger('change').wrap(element));

Cypress.Commands.addQuery(
    'hasClass',
    function hasClass(className: string) {
        return (elements: JQueryWithSelector) => elements.map((_, e) => e.classList.contains(className)).get();
    });

Cypress.Commands.addQuery(
    'texts',
    function texts(selector?: string) {
        return (element?: JQueryWithSelector) => {
            if (!element?.jquery && !selector) {
                throw Error('cy.texts(): either element or selector must be provided.');
            }
            return (element ? (selector ? element.find(selector) : element) : $(selector))
                .map((_, e) => e.innerText)
                .get();
        };
    });

Cypress.Commands.addQuery(
    'dlTexts',
    function dlTexts() {
        return (element: JQueryWithSelector) => element.find('dt')
            .map((_, dt) => [[dt.innerText, (dt.nextSibling as HTMLElement).innerText]])
            .get();
    });

Cypress.Commands.addQuery(
    'metricCards',
    function metricCards() {
        return (element: JQueryWithSelector) => element.find('app-metric-card')
            .map((_, card) => {
                const c = $(card);
                const sublabel = c.find('.metric-sublabel').text();
                return {
                    label: c.find('.metric-label').text(),
                    value: Number(c.find('.metric-value').text()),
                    // Sublabel is optional
                    ...(sublabel ? {sublabel} : undefined),
                };
            })
            .get();
    });

Cypress.Commands.add(
    'isValid',
    {prevSubject: 'element'},
    (element: JQueryWithSelector) => cy.wrap(element).siblings('.invalid-feedback').should('be.hidden').wrap(element));

Cypress.Commands.add(
    'isInvalid',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, text?: string) =>
        cy.wrap(element).should('have.class', 'is-invalid')
            .siblings('.invalid-feedback').should('be.visible')
            .should(fb => text && expect(fb.text()).eq(text))
            .wrap(element));

Cypress.Commands.add('login', (creds: Cypress.Credentials, options?: Cypress.LoginOptions) => {
    // Go to the login page and verify, if needed
    if (options?.goTo ?? true) {
        cy.visit(PATHS.auth.login);
        cy.isAt(PATHS.auth.login);
    }

    // Fill out the form
    cy.get('#email')         .setValue(creds.email)   .isValid();
    cy.get('#password input').setValue(creds.password).isValid();
    cy.get('button[type=submit]').click();

    // Verify the outcome
    if (options?.succeeds ?? true) {
        cy.isLoggedIn();
        cy.isAt(options?.redirectPath ?? PATHS.manage.dashboard);

    } else if (!options?.errToast) {
        throw Error('cy.login(): options.errToast must be provided when succeeds is false.');

    } else {
        // Still on the login page, and there's an error toast
        cy.isAt(PATHS.auth.login);
        cy.toastCheckAndClose(options.errToast);
    }
});

Cypress.Commands.add('logout', () => {
    cy.contains('app-control-center li a.cc-link', 'Logout').click();
    cy.confirmationDialog('Are you sure you want to logout?').dlgButtonClick('Logout');
    cy.isAt(PATHS.home);
    cy.isLoggedIn(false);
});

Cypress.Commands.add('loginViaApi', (creds: Cypress.Credentials, targetUrl: string, visitOptions?: Partial<Cypress.VisitOptions>) => {
    cy.request('POST', '/api/auth/login', {email: creds.email, password: creds.password})
        .then(resp => {
            expect(resp.status).to.eq(200);
            expect(resp.body.email).to.eq(creds.email);
        });
    cy.visit(targetUrl, visitOptions);
    cy.isLoggedIn();
});

Cypress.Commands.add('noToast', () => void cy.get('#toast-0').should('not.exist'));

Cypress.Commands.add('toastCheckAndClose', (id: string, details?: string) => {
    // Verify the toast's message ID
    cy.get('#toast-0 .message-id').should('have.text', id);

    // Verify the toast's details text, if any
    if (details !== undefined) {
        cy.get('#toast-0 .toast-details').should(d => details === '' ? expect(d).not.exist : expect(d).to.have.text(details));
    }

    // Close the toast and verify it's gone
    cy.get('#toast-0 button.btn-close').click().should('not.exist');
});

Cypress.Commands.add(
    'clickLabel',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, position?: Cypress.PositionType) =>
        cy.get(`label[for="${element.attr('id')}"]`).eq(0).click(position).wrap(element));

Cypress.Commands.add(
    'sidebarClick',
    {prevSubject: false},
    (itemLabel: string, isAt: string | RegExp) => {
        cy.contains('app-control-center li a.cc-link', itemLabel).click();
        cy.isAt(isAt);
    });

Cypress.Commands.add(
    'selectDomain',
    {prevSubject: false},
    (domain: Cypress.Domain) => {
        // Click on 'Domains'
        cy.contains('app-control-center li a.cc-link', 'Domains').click();
        cy.isAt(PATHS.manage.domains);

        // Click on the required domain
        cy.contains('app-domain-manager #domain-list a', domain.host).click();

        // We're a the domain properties
        cy.isAt(PATHS.manage.domains.id(domain.id).props);

        // Verify the domain is selected in the sidebar
        cy.contains('app-control-center li a.cc-link', domain.host).should('have.class', 'active');
    });

Cypress.Commands.add(
    'confirmationDialog',
    {prevSubject: false},
    (text?: string | RegExp) =>
        cy.get('ngb-modal-window[role=dialog] app-confirm-dialog')
            .should(dlg => {
                if (text) {
                    const s = dlg.find('.modal-body').text();
                    if (text instanceof RegExp) {
                        expect(s).match(text);
                    } else {
                        expect(s).eq(text);
                    }
                }
                return dlg;
            }));

Cypress.Commands.add(
    'dlgButtonClick',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, text: string) => cy.wrap(element).contains('.modal-footer button', text).click());

Cypress.Commands.add(
    'dlgCancel',
    {prevSubject: 'element'},
    (element: JQueryWithSelector) => cy.wrap(element).dlgButtonClick('Cancel'));

Cypress.Commands.add(
    'changeListSort',
    {prevSubject: 'optional'},
    (element: JQueryWithSelector, label: string, expectOrder: 'asc' | 'desc') => {
        const el = () => (element ? cy.wrap(element) : cy).find('app-sort-selector');

        // Click the sort dropdown
        el().find('button[ngbdropdowntoggle]')
            .should('have.text', 'Sort')
            .click();

        // Click the required sort button and check the sort order
        el().contains('div[ngbdropdownmenu] button', label)
            .click()
            .should('have.class', 'sort-' + expectOrder)
            .should('have.attr', 'aria-checked', 'true');

        // Click on sort dropdown again
        el().find('button[ngbdropdowntoggle]').click();

        // Verify the sort menu is gone
        el().find('div[ngbdropdownmenu]').should('not.be.visible');
    });

Cypress.Commands.add(
    'verifyRedirectsAfterLogin',
    {prevSubject: false},
    (path: string, user: Cypress.User, redirectPath?: string | RegExp | Cypress.IsAtObjectWithUnderscore) => {
        // Try to visit the path
        cy.visit(path);

        // We must be first redirected to the login
        cy.isAt(PATHS.auth.login);

        // Login with the given user, and we're redirected back
        cy.login(user, {goTo: false, redirectPath: redirectPath ?? path});
    });

Cypress.Commands.add(
    'verifyStayOnReload',
    {prevSubject: false},
    (path: string, user?: Cypress.User) => {
        // Login or visit the page directly
        if (user) {
            cy.loginViaApi(user, path);
        } else {
            cy.visit(path);
        }
        cy.isAt(path);

        // Reload the page
        cy.reload();

        // Wait for hte app to settle
        cy.wait(100);

        // Verify we're still on the same page
        cy.isAt(path);
    });

Cypress.Commands.add(
    'verifyListFooter',
    {prevSubject: 'optional'},
    (element: JQueryWithSelector, count: number, more: boolean, noDataText?: string) =>
        (element ? cy.wrap(element) : cy).get('app-list-footer').should(footer => {
            // Verify footer text
            switch (count) {
                case 0:
                    if (noDataText) {
                        expect(footer.text()).contain(noDataText);
                    } else {
                        expect(footer.text()).eq('No data available.');
                    }
                    break;

                case 1:
                    expect(footer.text()).eq('The only item displayed.');
                    break;

                default:
                    expect(footer.find('.item-count').text()).eq(`${more ? '' : 'All '}${count} items displayed.`);
            }

            // Verify whether there is a "Load more" button
            expect(footer.find('button:contains("Load more")')).length(more ? 1 : 0);
        }));

Cypress.Commands.add(
    'verifyTextInputValidation',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, minLength: number, maxLength: number, required: boolean, errMessage: string) => {
        // If the input is required, verify it gets invalid on no entry
        if (required) {
            cy.wrap(element).clear().isInvalid(errMessage);
        }

        // Check minimum length, if provided
        if (minLength > 0) {
            cy.wrap(element)
                .setValue('x'.repeat(minLength-1)).isInvalid(errMessage)
                .type('x').isValid();
        }

        // Check maximum length
        cy.wrap(element)
            .setValue('b'.repeat(maxLength+1)).isInvalid(errMessage)
            .type('{backspace}').isValid();
    });

Cypress.Commands.add(
    'verifyNumericInputValidation',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, min: number, max: number, required: boolean, errMessage: string) => {
        // If the input is required, verify it gets invalid on no entry
        if (required) {
            cy.wrap(element).clear().isInvalid(errMessage);
        }

        // Check ranges
        cy.wrap(element)
            .setValue(String(min-1)).isInvalid(errMessage)
            .setValue(String(min)).isValid()
            .setValue(String(max+1)).isInvalid(errMessage)
            .setValue(String(max)).isValid();
    });

Cypress.Commands.add(
    'verifyEmailInputValidation',
    {prevSubject: 'element'},
    (element: JQueryWithSelector) => cy.wrap(element)
        .clear().isInvalid('Please enter a valid email.')
        .type('abc').isInvalid()
        .type('@').isInvalid()
        .type('example.com').isValid()
        .setValue('x@y' + '.whatever'.repeat(28)).isInvalid() // 255 chars is too much
        .type('{backspace}').isValid()); // 254 chars is exactly right

Cypress.Commands.add(
    'verifyUrlInputValidation',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, required: boolean, secureOnly: boolean, errMessage: string) => cy.wrap(element)
        .clear().then(e => required ? cy.wrap(e).isInvalid(errMessage) : cy.wrap(e).isValid())
        .setValue('a').isInvalid(errMessage)
        .setValue('http://a').then(e => secureOnly ? cy.wrap(e).isInvalid(errMessage) : cy.wrap(e).isValid())
        .setValue('http://' + 'a'.repeat(2077)).isInvalid(errMessage)
        .setValue('https://a').isValid()
        .setValue('https://' + 'a'.repeat(2077)).isInvalid(errMessage)
        .setValue('https://' + 'a'.repeat(2076)).isValid());

Cypress.Commands.add(
    'verifyPasswordInputValidation',
    {prevSubject: 'element'},
    (element: JQueryWithSelector, options?: {required?: boolean, strong?: boolean}) => {
        // eslint-disable-next-line cypress/no-assigning-return-values
        const el = cy.wrap(element).clear();

        // Check required
        if (options?.required) {
            el.isInvalid('Please enter a password.');
        } else {
            el.isValid();
        }

        // Check strongness
        if (options?.strong) {
            el.type('p').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain an uppercase letter (A-Z).' +
                'Password must contain a digit or a special symbol.')
            .setValue('P').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain a lowercase letter (a-z).' +
                'Password must contain a digit or a special symbol.')
            .type('Pass').isInvalid(
                'Password must be at least 8 characters long.' +
                'Password must contain a digit or a special symbol.')
            .type('word').isInvalid(
                'Password must contain a digit or a special symbol.')
            .type('!').isValid();
        } else {
            el.type('p').isValid();
        }

        // Check max length
        return el.setValue('xY1!'.repeat(16)).isInvalid() // 64 chars is too much
            .type('{backspace}').isValid(); // 63 is good enough
    });

Cypress.Commands.add('testSiteVisit', {prevSubject: false}, (path: string) =>
    cy.visit(`${testSiteUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`));

Cypress.Commands.add('testSiteIsLoggedIn', {prevSubject: false}, (name: string) =>
    void cy.get('.comentario-root .comentario-profile-bar .comentario-name').should('have.text', name).and('be.visible'));

Cypress.Commands.add(
    'testSiteLogin',
    {prevSubject: false},
    (creds: Cypress.CredentialsWithName, options?: Cypress.TestSiteLoginOptions) => {
        // Verify it's a local user
        if (!creds.password) {
            throw new Error(`User ${creds.email} has no password`);
        }

        // If login must fail, disable Cypress' rejected promise handling
        if ((options?.verify ?? true) && !(options?.succeeds ?? true)) {
            Cypress.on('uncaught:exception', () => false);
        }

        // Click on Login: a popup dialog appears
        cy.contains('.comentario-root .comentario-profile-bar button', 'Login').click();
        cy.get('.comentario-root .comentario-dialog').should('be.visible');

        // Fill out the login form and submit
        cy.get('.comentario-root .comentario-dialog form').find('input[name=email]')   .setValue(creds.email);
        cy.get('.comentario-root .comentario-dialog form').find('input[name=password]').setValue(creds.password).type('{enter}');

        // Verify the outcome
        if (options?.verify ?? true) {
            if (options?.succeeds ?? true) {
                cy.testSiteIsLoggedIn(creds.name);
            } else if (!options?.errMessage) {
                throw new Error('cy.testSiteLogin(): options.errMessage is not specified');
            } else {
                cy.testSiteCheckMessage(options.errMessage);
            }
        }
    });

Cypress.Commands.add(
    'testSiteLoginViaApi',
    {prevSubject: false},
    (creds: Cypress.CredentialsWithName, path: string, options?: Cypress.TestSiteLoginOptions) => {
        cy.request<{sessionToken: string; principal: Cypress.CredentialsWithName}>({
                method:           'POST',
                url:              '/api/embed/auth/login',
                body:             {email: creds.email, password: creds.password, host: testSiteHost},
                failOnStatusCode: options?.succeeds ?? true,
            })
            .then(resp => {
                if (options?.succeeds ?? true) {
                    expect(resp.status).to.eq(200);
                    expect(resp.body.sessionToken).to.be.a('string');
                    expect(resp.body.principal.email).to.eq(creds.email);
                    expect(resp.body.principal.name).to.eq(creds.name);

                    // Store the session token in a cookie
                    cy.setCookie('comentario_commenter_session', resp.body.sessionToken);
                }
            });

        // Navigate to the page
        cy.testSiteVisit(path);

        // Verify the outcome
        if (options?.verify ?? true) {
            if (options?.succeeds ?? true) {
                cy.testSiteIsLoggedIn(creds.name);
            } else if (!options?.errMessage) {
                throw new Error('cy.testSiteLoginViaApi(): options.errMessage is not specified');
            } else {
                cy.testSiteCheckMessage(options.errMessage);
            }
        }
    });

Cypress.Commands.add('testSiteSsoLogin', {prevSubject: false}, () => {
    // Click on Login: a popup dialog appears
    cy.contains('.comentario-root .comentario-profile-bar button', 'Login').click();
    cy.get('.comentario-root .comentario-dialog').should('be.visible');

    // Click on the SSO login button: the process runs in the background
    cy.contains('.comentario-root .comentario-dialog form button', 'Single Sign-On').click();

    // Verify user name in the profile bar
    cy.testSiteIsLoggedIn('John Doe');
});

Cypress.Commands.add(
    'testSiteLogout',
    {prevSubject: false},
    () => void cy.contains('.comentario-root .comentario-profile-bar button', 'Logout').click());

Cypress.Commands.add(
    'testSiteCheckMessage',
    {prevSubject: false},
    (message: string, success?: boolean) =>
        void cy.contains('.comentario-root .comentario-message-box', message)
            .should('be.visible')
            .and(success ? 'not.have.class' : 'have.class', 'comentario-error'));

Cypress.Commands.add('backendReset', () =>
    cy.request('POST', '/api/e2e/reset').its('status').should('eq', 204));

Cypress.Commands.add('backendSetDynConfigItem', (key: string, value: string | number | boolean) =>
    cy.request('PUT', '/api/e2e/config/dynamic', {key, value: String(value)}).its('status').should('eq', 204));

Cypress.Commands.add('backendGetSentEmails', () =>
    cy.request('/api/e2e/mails').should(response => expect(response.status).to.eq(200)).its('body'));

Cypress.Commands.add('backendPatchDomain', (id: string, values: any) =>
    void cy.request('PATCH', `/api/e2e/domains/${id}`, values).its('status').should('eq', 204));

Cypress.Commands.add('backendUpdateDomainIdps', (id: string, idps: string[]) =>
    void cy.request('PUT', `/api/e2e/domains/${id}/idps`, idps).its('status').should('eq', 204));
