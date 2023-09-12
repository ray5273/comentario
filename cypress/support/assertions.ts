const YAML = require('yamljs');

chai.use((_chai) => {

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
    _chai.Assertion.addMethod('matrixMatch', function(expected: (string | string[] | RegExp)[][], options?: {trim: boolean}) {

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

        // Verify every element, which is itself a string[]
        expected.forEach((exp, idx) => matchSubArray(this._obj[idx], exp, idx));
    });

    // Deeply compares the object, passed as a YAML string, against the expectation
    _chai.Assertion.addMethod('yamlMatch', function(expStr: string) {

        const deepMatch = (path: string, act: any, exp: any) => {
            // Verify type
            const expType = typeof exp;
            const actType = typeof act;
            this.assert(
                actType === expType,
                `expected element at "${path}" ("${act}", type ${actType}) to be ${expType}`,
                `expected element at "${path}" ("${act}", type ${actType}) not to be ${expType}`,
                expType,
                actType);

            // Compare values
            switch (expType) {
                // Primitive: compare for literal equality
                case 'string':
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
});
