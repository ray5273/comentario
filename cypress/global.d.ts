declare namespace Cypress {

    interface User {
        isAnonymous: boolean;
        id:          string;
        email:       string;
        name:        string;
        password?:   string;
        isBanned?:   boolean;
    }

    interface SentMail {
        headers:    { [k: string]: string };
        embedFiles: string[];
        body:       string;
        succeeded:  boolean;
    }

    /** Rendered comment. */
    interface Comment {
        id:        string;
        html:      string;
        author:    string;
        score:     number;
        upvoted:   boolean;
        downvoted: boolean;
        sticky:    boolean;
        pending:   boolean;
        children?: Comment[];
    }

    interface Chainable {

        /**
         * Assert the current URL corresponds to the given relative path.
         * @param expected Literal path or a regex to match the current path against
         * @param options Additional options
         */
        isAt(expected: string | RegExp, options?: {ignoreQuery?: boolean}): Chainable<string>;

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
         * Collect visible texts of all child elements or all elements matching the selector and return them as a string
         * array. Must either be used as a child command, or be given a selector (or both).
         */
        texts(selector?: string): Chainable<string[]>;

        /**
         * Verify the passed element has no invalid feedback.
         */
        isValid(): Chainable<JQueryWithSelector>;

        /**
         * Verify the passed element has the .is-invalid class, invalid feedback, and, optionally, its text.
         */
        isInvalid(text?: string): Chainable<JQueryWithSelector>;

        /**
         * Signup as provided user via the UI.
         * @param user User to login as
         * @param options Additional options, default to {goTo: true}
         */
        signup(user: {email: string, name: string, password: string}, options?: {goTo?: boolean}): Chainable<void>;

        /**
         * Login as provided user via the UI.
         * @param user User to login as
         * @param options Additional options, default to {goTo: true, verify: true}
         */
        login(user: {email: string, password: string}, options?: {goTo?: boolean, verify?: boolean}): Chainable<void>;

        /**
         * Verify there is no toast.
         */
        noToast(): Chainable<Element>;

        /**
         * Verify the topmost toast has the given ID, and, optionally, details text, then close it with the Close button.
         */
        toastCheckAndClose(id: string, details?: string): Chainable<Element>;

        /**
         * Just like cy.visit(), but uses the test site URL as base.
         * @param path Path to visit.
         */
        visitTestSite(path: string): Chainable<AUTWindow>;

        /**
         * Request the backend to reset the database and all the settings to test defaults.
         */
        backendReset(): void;

        /**
         * Request the backend to update the given dynamic config item.
         */
        backendSetDynConfigItem(key: string, value: string): void;

        /**
         * Obtain and return all sent emails from the backend.
         */
        backendGetSentEmails(): Chainable<SentMail[]>;
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
