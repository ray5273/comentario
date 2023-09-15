declare namespace Cypress {

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
         * @param ignoreQuery Whether to strip the query parameters before comparing
         */
        isAt(expected: string | RegExp, ignoreQuery?: boolean): Chainable<string>;

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
         * Just like cy.visit(), but uses the test site URL as base.
         * @param path Path to visit.
         */
        visitTestSite(path: string): Chainable<AUTWindow>;

        /**
         * Request the backend to reset the database and all the settings to test defaults.
         */
        backendReset(): void;

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
             'yamlMatch'   | 'not.yamlMatch'
        ): Chainable<Subject>;
    }
}
