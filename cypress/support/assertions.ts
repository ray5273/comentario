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
});
