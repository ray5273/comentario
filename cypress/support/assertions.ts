import * as YAML from 'yamljs';

chai.use((_chai: Chai.ChaiStatic) => {

    // Checks the passed array against the expectation. If a string array is passed for expected, it's converted into a linebreak-separated
    // string
    _chai.Assertion.addMethod('arrayMatch', function(expected: (string | string[] | RegExp)[], options?: {trim: boolean}) {

        // Matches individual elements of the array
        const matchElement = (act: string, exp: string | string[] | RegExp, idx: number) => {
            // Don't bother if the expectation is null - it means we don't care
            if (exp === null) {
                return;
            }

            // Trim the actual value, if needed
            if (options?.trim) {
                act = act.trim();
            }

            // It's a regex - match the actual against it
            if (exp instanceof RegExp) {
                this.assert(
                    act.match(exp),
                    `expected element[${idx}] ("${act}") to match "${exp}"`,
                    `expected element[${idx}] ("${act}") not to match "${exp}"`,
                    exp,
                    act);

            } else {
                // If a string[] is passed, convert int into a linebreak-separated string
                if (Array.isArray(exp)) {
                    exp = exp.join('\n');
                }
                // Compare literally
                this.assert(
                    act === exp,
                    `expected element[${idx}] ("${act}") to equal "${exp}"`,
                    `expected element[${idx}] ("${act}") not to equal "${exp}"`,
                    exp,
                    act);
            }
        };

        // Verify type and length
        this.assert(
            Array.isArray(this._obj) && this._obj.length === expected.length,
            `expected #{this} to be an Array(${expected.length})`,
            `expected #{this} not to be an Array(${expected.length})`,
            expected);

        // Verify every element, which is itself a string[]
        expected.forEach((exp, idx) => matchElement(this._obj[idx], exp, idx));
    });

    // Checks the passed two-dimensional array (a.k.a. matrix) against the expectation. If a string array is passed for expected, it's
    // converted into a linebreak-separated string
    _chai.Assertion.addMethod('matrixMatch', function(expected: ((string | string[] | RegExp)[] | null)[], options?: {trim: boolean}) {

        // Matches individual elements of the array
        const matchElement = (act: string, exp: string | string[] | RegExp, idx1: number, idx2: number) => {
            // Don't bother if the expectation is null - it means we don't care
            if (exp === null) {
                return;
            }

            // Trim the value, if needed
            if (options?.trim) {
                act = act.trim();
            }
            // It's a regex - match the actual against it
            if (exp instanceof RegExp) {
                this.assert(
                    act.match(exp),
                    `expected element[${idx1}, ${idx2}] ("${act}") to match "${exp}"`,
                    `expected element[${idx1}, ${idx2}] ("${act}") not to match "${exp}"`,
                    exp,
                    act);

            } else {
                // If a string[] is passed, convert int into a linebreak-separated string
                if (Array.isArray(exp)) {
                    exp = exp.join('\n');
                }
                // Compare literally
                this.assert(
                    act === exp,
                    `expected element[${idx1}, ${idx2}] ("${act}") to equal "${exp}"`,
                    `expected element[${idx1}, ${idx2}] ("${act}") not to equal "${exp}"`,
                    exp,
                    act);
            }
        };

        // Matches a nested array against the expectation
        const matchSubArray = (subActual: string[], subExpected: (string | string[] | RegExp)[], idx: number) => {
            // Verify type and length
            this.assert(
                Array.isArray(subActual) && subActual.length === subExpected.length,
                `expected element[${idx}] ${subActual.constructor.name}(${subActual.length}) to be an Array(${subExpected.length})`,
                `expected element[${idx}] ${subActual.constructor.name}(${subActual.length}) not to be an Array(${subExpected.length})`,
                subExpected,
                subActual);

            // Verify elements
            subExpected.forEach((s, i) => matchElement(subActual[i], s, idx, i));
        };

        // Verify type and length
        this.assert(
            Array.isArray(this._obj) && this._obj.length === expected.length,
            `expected #{this} to be an Array(${expected.length})`,
            `expected #{this} not to be an Array(${expected.length})`,
            expected);

        // Verify every element, with the exception of null (which means "we don't care"), which is otherwise a string[]
        expected.forEach((exp, idx) => exp === null || matchSubArray(this._obj[idx], exp, idx));
    });

    // Deeply compares the object, passed as a YAML string, against the expectation
    _chai.Assertion.addMethod('yamlMatch', function(expStr: string) {

        const deepMatch = (path: string, act: any, exp: any) => {
            // Verify type
            const expType = typeof exp;
            const actType = typeof act;
            this.assert(
                // The type must be exactly the same, with one exception: a RegExp expectation can be used to verify a
                // string
                actType === expType ||
                    actType === 'string' && exp instanceof RegExp,
                `expected element at "${path}" ("${act}", type ${actType}) to be ${expType}`,
                `expected element at "${path}" ("${act}", type ${actType}) not to be ${expType}`,
                expType,
                actType);

            // Compare values
            switch (actType) {
                // String
                case 'string':
                    // If the expectation is a RegExp, match against it
                    if (exp instanceof RegExp) {
                        this.assert(
                            act.match(exp),
                            `expected element at "${path}" ("${act}") to match "${exp}"`,
                            `expected element at "${path}" ("${act}") not to match "${exp}"`,
                            exp,
                            act);

                    // Otherwise, just compare the strings. Trim the actual value
                    } else {
                        act = act.trim();
                        this.assert(
                            act === exp,
                            `expected element at "${path}" ("${act}") to equal "${exp}"`,
                            `expected element at "${path}" ("${act}") not to equal "${exp}"`,
                            exp,
                            act,
                            true);
                    }
                    break;

                // Primitive: compare for literal equality
                case 'number':
                case 'bigint':
                case 'boolean':
                case 'undefined':
                    this.assert(
                        act === exp,
                        `expected element at "${path}" ("${act}") to equal "${exp}"`,
                        `expected element at "${path}" ("${act}") not to equal "${exp}"`,
                        exp,
                        act,
                        true);
                    break;

                // Object: compare individual properties
                case 'object':
                    // Check for expected properties
                    for (const key in exp) {
                        // First, check the property is present
                        this.assert(
                            key in act,
                            `expected element at "${path}" to have property "${key}" (value = "${exp[key]}")`,
                            `expected element at "${path}" not to have property "${key}" (value = "${exp[key]}")`,
                            exp,
                            act);

                        // Now check its value
                        deepMatch(
                            key.match(/^\d+$/) ? `${path}[${key}]` : `${path}.${key}`,
                            act[key],
                            exp[key]);
                    }
                    // Check for unexpected properties
                    for (const key in act) {
                        this.assert(
                            key in exp,
                            `expected element at "${path}" not to have property "${key}" (value = "${act[key]}")`,
                            `expected element at "${path}" to have property "${key}" (value = "${act[key]}")`,
                            exp,
                            act);
                    }
                    break;

                case 'function':
                case 'symbol':
                    throw Error(`Unsupported type: ${expType}`);
            }
        };

        deepMatch('$', this._obj, YAML.parse(expStr));
    });

    // Checks the passed anchor element that it's an external link
    _chai.Assertion.addMethod(
        'anchor',
        function(
            expectedUrl: string | RegExp,
            options?: {newTab?: boolean; noOpener?: boolean; noReferrer?: boolean; noFollow?: boolean},
        ) {
            // Verify it's an anchor
            const a = this._obj[0];
            this.assert(
                a.tagName === 'A',
                `expected #{this} to be an anchor element`,
                `expected #{this} not to be an anchor element`,
                a);

            // Verify the href
            if (expectedUrl instanceof RegExp) {
                this.assert(
                    a.href.match(expectedUrl),
                    `expected href='${a.href}' to match "${expectedUrl}"`,
                    `expected href='${a.href}' not to match "${expectedUrl}"`,
                    expectedUrl,
                    a.href);
            } else {
                this.assert(
                    a.href === expectedUrl,
                    `expected href='${a.href}' to equal "${expectedUrl}"`,
                    `expected href='${a.href}' not to equal "${expectedUrl}"`,
                    expectedUrl,
                    a.href);
            }

            // Verify options
            if (options) {
                if (options.newTab !== undefined) {
                    this.assert(
                        (a.target === '_blank') === options.newTab,
                        `expected target='${a.target}' to be "_blank"`,
                        `expected target='${a.target}' not to be "_blank"`,
                        true,
                        a.target);
                }
                if (options.noOpener !== undefined) {
                    this.assert(
                        (a.rel.indexOf('noopener') >= 0) === options.noOpener,
                        `expected rel='${a.rel}' to not contain "noopener"`,
                        `expected rel='${a.rel}' to contain "noopener"`,
                        options.noOpener,
                        a.rel);
                }
                if (options.noReferrer !== undefined) {
                    this.assert(
                        (a.rel.indexOf('noreferrer') >= 0) === options.noReferrer,
                        `expected rel='${a.rel}' to not contain "noreferrer"`,
                        `expected rel='${a.rel}' to contain "noreferrer"`,
                        options.noReferrer,
                        a.rel);
                }
                if (options.noFollow !== undefined) {
                    this.assert(
                        (a.rel.indexOf('nofollow') >= 0) === options.noFollow,
                        `expected rel='${a.rel}' to not contain "nofollow"`,
                        `expected rel='${a.rel}' to contain "nofollow"`,
                        options.noFollow,
                        a.rel);
                }
            }
        });


    // Checks the passed anchor element is an RSS feed link
    _chai.Assertion.addMethod(
        'rssLink',
        function(params: Record<string, string>) {
            expect(this._obj).anchor(
                Cypress.config().baseUrl + '/api/rss/comments?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&'),
                {newTab: true, noOpener: true, noReferrer: true, noFollow: false});
        });
});
