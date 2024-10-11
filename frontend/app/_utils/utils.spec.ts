import { Utils } from './utils';

describe('Utils', () => {

    describe('escapeAttrValue', () => {
        [
            {v: null,        want: ''},
            {v: undefined,   want: ''},
            {v: '',          want: ''},
            {v: 'abc',       want: 'abc'},
            {v: '"abc"',     want: '&quot;abc&quot;'},
            {v: '<x\'y">&!', want: '&lt;x&#39;y&quot;&gt;&amp;!'},
        ]
            .forEach(test => it(`given '${test.v}', returns ${test.want}`, () =>
                expect(Utils.escapeAttrValue(test.v)).toBe(test.want)));
    });

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
            .forEach(test => it(`given '${test.v}', returns ${test.want}`, () =>
                expect(Utils.isHexToken(test.v)).toBe(test.want)));
    });

    describe('joinUrl', () => {
        [
            {v: [],                               want: ''},
            {v: ['a'],                            want: 'a'},
            {v: ['a/'],                           want: 'a/'},
            {v: ['/a'],                           want: '/a'},
            {v: ['/a/'],                          want: '/a/'},
            {v: ['a',   ''],                      want: 'a/'},
            {v: ['a/',  ''],                      want: 'a/'},
            {v: ['/a/', ''],                      want: '/a/'},
            {v: ['/a',  '/'],                     want: '/a/'},
            {v: ['/a/', '/'],                     want: '/a/'},
            {v: ['a',   'b'],                     want: 'a/b'},
            {v: ['a/',  'b'],                     want: 'a/b'},
            {v: ['/a/', 'b'],                     want: '/a/b'},
            {v: ['a',   '/b'],                    want: 'a/b'},
            {v: ['a/',  '/b'],                    want: 'a/b'},
            {v: ['/a/', '/b'],                    want: '/a/b'},
            {v: ['/a/', 'b/'],                    want: '/a/b/'},
            {v: ['a',   'b/', '/c/', '/d', 'e/'], want: 'a/b/c/d/e/'},
        ]
            .forEach(test => it(`given '${test.v}', returns ${test.want}`, () =>
                expect(Utils.joinUrl(...test.v)).toBe(test.want)));
    });

    describe('sortByKey', () => {
        [
            {v: undefined,                               want: undefined},
            {v: {},                                      want: {}},
            {v: {x: 42},                                 want: {x: 42}},
            {v: {x: 42, y: 'bar'},                       want: {x: 42, y: 'bar'}},
            {v: {y: 'bar', x: 42},                       want: {x: 42, y: 'bar'}},
            {v: {y: 'bar', z: 'foo', foo: false, x: 42}, want: {foo: false, x: 42, y: 'bar', z: 'foo'}},
        ]
            .forEach(test => it(`given '${test.v}', returns ${test.want}`, () =>
                // Compare as JSON strings to enforce order check
                expect(JSON.stringify(Utils.sortByKey(test.v))).toBe(JSON.stringify(test.want))));
    });

    describe('hashString', () => {
        [
            {v: '',                           max:   1, want: 0},
            {v: '',                           max:  99, want: 0},
            {v: '1',                          max:  60, want: 19},
            {v: '1',                          max:  10, want: 9},
            {v: 'Lorem',                      max:  60, want: 41},
            {v: 'Lorem',                      max:  37, want: 26},
            {v: 'Lorem ipsum dolor sit amet', max: 200, want: 100},
            {v: 'Lorem ipsum dolor sit amet', max:  60, want: 0},
            {v: 'Lorem ipsum dolor sit amet', max:  25, want: 0},
        ]
            .forEach(test => it(`given v='${test.v}' and max=${test.max}, returns ${test.want}`, () =>
                expect(Utils.hashString(test.v, test.max)).toBe(test.want)));
    });
});
