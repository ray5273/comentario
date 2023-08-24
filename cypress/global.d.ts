declare namespace Cypress {

    interface Chainable {

        /**
         * Request the backend to reset the database and all the settings to test defaults.
         */
        backendReset(): void;

        /**
         * Assert the current URL corresponds to the given relative path.
         * @param expected Literal path or a regex to match the current path against
         * @param ignoreQuery Whether to strip the query parameters before comparing
         */
        isAt(expected: string | RegExp, ignoreQuery?: boolean): Chainable<string>;
    }
}
