import { Utils } from './utils';

describe('Utils', () => {

    describe('isHexToken', () => {
        [
            {v: null,                                                                want: false},
            {v: undefined,                                                           want: false},
            {v: {},                                                                  want: false},
            {v: [],                                                                  want: false},
            {v: 42,                                                                  want: false},
            {v: '',                                                                  want: false},
            {v: '000000000000000000000000000000000000000000000000000000000000200',   want: false},
            {v: '0000000000000000000000000000000000000000000000000000000000002001',  want: true},
            {v: '00000000000000000000000000000000000000000000000000000000000020011', want: false},
            {v: '1dae2342c9255a4ecc78f2f54380d90508aa49761f3471e94239f178a210bcba',  want: true},
            {v: '1dae2342c9255a4ecc78f2f54380d90508aa49761f3471e94239f178a210bcbg',  want: false},
        ]
            .forEach(test => it(`given '${test.v}', returns ${test.want}`, () => {
                expect(Utils.isHexToken(test.v)).toBe(test.want);
            }));
    });
});
