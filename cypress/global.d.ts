declare namespace Cypress {

    interface Credentials {
        email:    string;
        password: string;
    }

    type CredentialsWithName = Credentials & {
        name: string;
    }

    interface User extends CredentialsWithName {
        isAnonymous: boolean;
        id:          string;
        isBanned?:   boolean;
    }

    interface Domain {
        id:    string;
        host:  string;
        name?: string;
    }

    interface SentMail {
        headers:    { [k: string]: string };
        embedFiles: string[];
        body:       string;
        succeeded:  boolean;
    }

    /** A comment button residing on the card's bottom toolbar. The elements are actually button titles. */
    type CommentButton = 'Upvote' | 'Downvote' | 'Reply' | 'Approve' | 'Reject' | 'Sticky' | 'Sticky comment' | 'Unsticky' | 'Edit' | 'Delete';

    /** Rendered comment. */
    interface Comment {
        id:        string;
        html:      string;
        author:    string;
        score:     number | null;
        upvoted:   boolean;
        downvoted: boolean;
        sticky:    boolean;
        pending:   boolean;
        buttons:   CommentButton[];
        children?: Comment[];
    }

    interface MetricCardContent {
        label:     string;
        sublabel?: string;
        value:     number;
    }

    interface LoginOptions {
        /** Whether to go to the login page before trying to login. Defaults to true. */
        goTo?: boolean;
        /** Whether login must succeed. Defaults to true. */
        succeeds?: boolean;
        /** Path the user is redirected to after login. Only when succeeds is true. Defaults to the Dashboard path. */
        redirectPath?: string | RegExp | IsAtObjectWithUnderscore;
        /** Error toast shown after login fails. Ignored unless succeeds is false, otherwise mandatory. */
        errToast?: string;
    }

    interface TestSiteLoginOptions {
        /** Whether to verify the result (only works if the embedded Comentario is visible upon login). Defaults to true. */
        verify?: boolean;
        /** Whether login must succeed. Ignored when verify is false, otherwise defaults to true. */
        succeeds?: boolean;
        /** Error notification shown after login fails. Ignored unless succeeds is false, otherwise mandatory. */
        errMessage?: string;
    }

    interface IsAtObjectWithUnderscore {
        _: string | RegExp;
    }

    interface IsAtOptions {
        /** If true, the query string is ignored. */
        ignoreQuery?: boolean;
        /** Whether the path refers to the test site, rather than the front-end. */
        testSite?: boolean;
    }

    interface Chainable {

        /**
         * Assert the current URL corresponds to the given relative path.
         * @param expected Literal path or a regex to match the current path against
         * @param options Additional options
         */
        isAt(expected: string | RegExp | IsAtObjectWithUnderscore, options?: IsAtOptions): Chainable<string>;

        /**
         * Assert the user is authenticated (or not).
         * @param loggedIn If true (the default), the user must be logged in, otherwise they must be logged out.
         */
        isLoggedIn(loggedIn?: boolean): Chainable<void>;

        /**
         * Collect page comments and return them as a tree structure. Can be chained off an element containing the
         * desired Comentario instance, if no subject is provided, looks for the first <comentario-comments> tag.
         * @param properties Properties to keep for each comment. If not provided, keeps all properties.
         */
        commentTree(...properties: (keyof Comment)[]): Chainable<Partial<Comment>[]>;

        /**
         * Set an input's value directly.
         */
        setValue(s: string): Chainable<JQueryWithSelector>;

        /**
         * Tests every element passed as subject whether they have the specified class, and returns the result as a
         * boolean[].
         */
        hasClass(className: string): Chainable<boolean[]>;

        /**
         * Collect attribute values of all subject elements, and return them as a string array.
         */
        attrValues(attrName: string): Chainable<(string | null)[]>;

        /**
         * Collect visible texts of all child elements or all elements matching the selector and return them as a string
         * array. Must either be used as a child command, or be given a selector (or both).
         */
        texts(selector?: string): Chainable<string[]>;

        /**
         * Collect visible texts of <dt> and <dd> elements of a definition list and return as an array of two-element
         * arrays: [[dt, dd], [dt, dd], ...]. Must be chained off a <dl> element.
         */
        dlTexts(): Chainable<string[][]>;

        /**
         * Collect metric cards and return them in an array. Must be chained off an element that contains cards.
         */
        metricCards(): Chainable<MetricCardContent[]>;

        /**
         * Verify the passed element has no invalid feedback.
         */
        isValid(): Chainable<JQueryWithSelector>;

        /**
         * Verify the passed element has the .is-invalid class, invalid feedback, and, optionally, its text.
         */
        isInvalid(text?: string): Chainable<JQueryWithSelector>;

        /**
         * Login as provided user via the UI.
         * @param creds Credentials to login with
         * @param options Additional login options
         */
        login(creds: Credentials, options?: LoginOptions): Chainable<void>;

        /**
         * Log the currently authenticated user out via the UI.
         * NB: the sidebar must be visible.
         */
        logout(): Chainable<void>;

        /**
         * Login as provided user directly, via an API call.
         * @param creds Credentials to login with
         * @param targetUrl URL to go to after the login.
         * @param visitOptions Optional visit options.
         */
        loginViaApi(creds: Credentials, targetUrl: string, visitOptions?: Partial<VisitOptions>): Chainable<void>;

        /**
         * Verify there is no toast.
         */
        noToast(): Chainable<Element>;

        /**
         * Verify the topmost toast has the given ID, and, optionally, details text, then close it with the Close
         * button.
         * @param id ID of the toast to check.
         * @param details If provided, the toast must contain this text. Empty string explicitly indicates no details.
         */
        toastCheckAndClose(id: string, details?: string): Chainable<Element>;

        /**
         * Click the label associated with the given element (based on the label's "for" attribute).
         */
        clickLabel(position?: PositionType): Chainable<JQueryWithSelector>;

        /**
         * Click a sidebar item with the given label and verify the resulting path.
         * @param itemLabel Label of the sidebar item to click.
         * @param isAt Path to verify.
         */
        sidebarClick(itemLabel: string, isAt: string | RegExp | IsAtObjectWithUnderscore): Chainable<void>;

        /**
         * Select a domain using the Domains page.
         * NB: the sidebar must be visible.
         * @param domain Domain to select.
         */
        selectDomain(domain: Domain): Chainable<void>;

        /**
         * Return the currently open confirmation dialog.
         * @param text Optional text the dialog has to contain.
         */
        confirmationDialog(text?: string | RegExp): Chainable<JQueryWithSelector>;

        /**
         * Click a confirmation dialog button having the given label. Must be chained off a dialog returned with
         * confirmationDialog().
         * @param text Button text.
         */
        dlgButtonClick(text: string): Chainable<JQueryWithSelector>;

        /**
         * Cancel the confirmation dialog. Must be chained off a dialog returned with confirmationDialog().
         */
        dlgCancel(): Chainable<JQueryWithSelector>;

        /**
         * Click a sort dropdown and then a sort button with the given label.
         * @param label Sort button label to click.
         * @param expectOrder The expected sort order after the click.
         */
        changeListSort(label: string, expectOrder: 'asc' | 'desc'): Chainable<void>;

        /**
         * Verify that when visiting the given path, the application first redirects to the login page and subsequently
         * back to that path.
         * @param path Path to verify.
         * @param user User to login as.
         * @param redirectPath Real redirect path. Defaults to `path`.
         */
        verifyRedirectsAfterLogin(path: string, user: User, redirectPath?: string | RegExp | IsAtObjectWithUnderscore): Chainable<void>;

        /**
         * Verify the application stays on the provided page after a reload.
         * @param path Path to verify.
         * @param user Optional user to login as.
         */
        verifyStayOnReload(path: string, user?: User): Chainable<void>;

        /**
         * Verify text in the list footer. Can be chained off an element containing the footer.
         * @param count Expected number of items reported in the footer.
         * @param more Whether there are more items that can be loaded.
         * @param noDataText Optional (partial) custom text to expect if there's no data.
         * @return The footer element.
         */
        verifyListFooter(count: number, more: boolean, noDataText?: string): Chainable<JQueryWithSelector>;

        /**
         * Run common text input validations against the passed element.
         * NB: the input must be touched.
         * @param minLength Minimum allowed input length.
         * @param maxLength Maximum allowed input length.
         * @param required Whether the input is required.
         * @param errMessage Error message to expect on an invalid input.
         */
        verifyTextInputValidation(minLength: number, maxLength: number, required: boolean, errMessage: string): Chainable<JQueryWithSelector>;

        /**
         * Run common numeric input validations against the passed element.
         * NB: the input must be touched.
         * @param min Minimum allowed input value.
         * @param max Maximum allowed input value.
         * @param required Whether the input is required.
         * @param errMessage Error message to expect on an invalid input.
         */
        verifyNumericInputValidation(min: number, max: number, required: boolean, errMessage: string): Chainable<JQueryWithSelector>;

        /**
         * Run common email input validations against the passed element.
         * NB: the input must be touched.
         */
        verifyEmailInputValidation(): Chainable<JQueryWithSelector>;

        /**
         * Run common URL input validations against the passed element.
         * NB: the input must be touched.
         * @param required Whether the input is required.
         * @param secureOnly Whether only secure URLs are allowed.
         * @param errMessage Error message to expect on an invalid input.
         */
        verifyUrlInputValidation(required: boolean, secureOnly: boolean, errMessage: string): Chainable<JQueryWithSelector>;

        /**
         * Run common password input validations against the passed element.
         * NB: the input must be touched.
         */
        verifyPasswordInputValidation(options?: {required?: boolean, strong?: boolean}): Chainable<JQueryWithSelector>;

        /***************************************************************************************************************
          Test site
        ***************************************************************************************************************/

        /**
         * Just like cy.visit(), but uses the test site URL as base.
         * @param path Path to visit.
         */
        testSiteVisit(path: string): Chainable<AUTWindow>;

        /**
         * Verify the user is logged in on the test site.
         * @param name Name of the user.
         */
        testSiteIsLoggedIn(name: string): Chainable<void>;

        /**
         * Login into the embedded Comentario (test site) as provided user via the UI.
         * @param creds Credentials to login with.
         * NB: the required test site page must be open.
         * @param options Optional login options.
         */
        testSiteLogin(creds: CredentialsWithName, options?: TestSiteLoginOptions): Chainable<void>;

        /**
         * Login as provided user into embedded Comentario directly, via an API call.
         * @param creds Credentials to login with
         * @param path Path to go to after the login.
         * @param options Optional login options.
         */
        testSiteLoginViaApi(creds: CredentialsWithName, path: string, options?: TestSiteLoginOptions): Chainable<void>;

        /**
         * Login into the embedded Comentario (test site) using SSO, via the UI.
         * NB: the required test site page must be open.
         */
        testSiteSsoLogin(): Chainable<void>;

        /**
         * Log out from the embedded Comentario (test site).
         * NB: the required test site page must be open.
         */
        testSiteLogout(): Chainable<void>;

        /**
         * Verify the text in the message box on the test site.
         * @param message Expected message (partial) text.
         * @param success Whether the message is a success message, defaults to false.
         */
        testSiteCheckMessage(message: string, success?: boolean): Chainable<void>;

        /***************************************************************************************************************
          Backend
         ***************************************************************************************************************/

        /**
         * Request the backend to reset the database and all the settings to test defaults.
         */
        backendReset(): void;

        /**
         * Request the backend to update the given dynamic config item.
         */
        backendSetDynConfigItem(key: string, value: string | number | boolean): void;

        /**
         * Obtain and return all sent emails from the backend.
         */
        backendGetSentEmails(): Chainable<SentMail[]>;

        /**
         * Patch properties of the specified domain.
         * @param id ID of the domain to patch.
         * @param values Properties to patch. Properties not provided will be left unchanged.
         */
        backendPatchDomain(id: string, values: any): Chainable<void>;

        /**
         * Update the list of federated identity providers enabled for the specified domain.
         * @param id ID of the domain to patch.
         * @param idps List of enabled IdP IDs.
         */
        backendUpdateDomainIdps(id: string, idps: string[]): Chainable<void>;
    }

    // noinspection JSUnusedGlobalSymbols
    interface Chainer<Subject> {
        (chainer:
             'arrayMatch'  | 'not.arrayMatch'  |
             'matrixMatch' | 'not.matrixMatch' |
             'yamlMatch'   | 'not.yamlMatch'   |
             'be.anchor'   | 'not.be.anchor'
        ): Chainable<Subject>;
    }
}


declare namespace Chai {
    // Implemented in assertions.ts
    // noinspection JSUnusedGlobalSymbols
    interface Assertion {
        arrayMatch(expected: (string | string[] | RegExp)[], options?: {trim: boolean}): void;
        matrixMatch(expected: (string | string[] | RegExp)[][]): void;
        yamlMatch(expected: string): void;
        anchor(expectedUrl: string | RegExp, options?: {newTab?: boolean; noOpener?: boolean; noReferrer?: boolean; noFollow?: boolean}): void;
    }
}
