import { Utils } from './utils';

describe('Utils', () => {

    describe('parseDate', () => {

        [
            {in: undefined,             want: undefined},
            {in: null,                  want: undefined},
            {in: '',                    want: undefined},
            {in: 42,                    want: undefined},
            {in: 'short-str',           want: undefined},
            {in: '0001-12-31',          want: undefined},
            {in: '2001-01-01',          want: new Date('2001-01-01T00:00:00.000Z')},
            {in: '4999-12-31',          want: new Date('4999-12-31T00:00:00.000Z')},
            {in: '2016-04-02 15:22:14', want: new Date('2016-04-02 15:22:14')},
        ]
            .forEach(test =>
                it(`given '${test.in}', returns '${test.want}'`, () =>
                    expect(Utils.parseDate(test.in)).toEqual(test.want)));
    });

    describe('isUuid', () => {

        [
            {in: undefined,                              want: false},
            {in: null,                                   want: false},
            {in: '',                                     want: false},
            {in: 42,                                     want: false},
            {in: {},                                     want: false},
            {in: 'foo',                                  want: false},
            {in: '00000000-0000-0000-0000-000000000000', want: true},
            {in: 'a74f0603-7ae6-46fe-a0bd-5286d4bfc853', want: true},
        ]
            .forEach(test =>
                it(`given '${test.in}', returns '${test.want}'`, () =>
                    expect(Utils.isUuid(test.in)).toEqual(test.want)));
    });

    describe('timeAgo', () => {

        const t = (id: string) => ({_lang: 'en', timeJustNow: 'just now'}[id] || '');

        [
            {cur: 0,                        prev: undefined, want: ''},
            {cur: 0,                        prev: 0,         want: ''},
            {cur: 0,                        prev: 1,         want: 'just now'},
            {cur: 1000,                     prev: 520,       want: 'just now'},
            {cur: 60_000,                   prev: 20,        want: 'just now'},
            {cur: 60_020,                   prev: 20,        want: '1 minute ago'},
            {cur: 1000_000,                 prev: 20,        want: '16 minutes ago'},
            {cur: 60*60*1000,               prev: 1,         want: '59 minutes ago'},
            {cur: 60*60*1000 + 1,           prev: 1,         want: '1 hour ago'},
            {cur: 10*60*60*1000 + 1,        prev: 1,         want: '10 hours ago'},
            {cur: 24*60*60*1000 + 1,        prev: 1,         want: 'yesterday'},
            {cur: 8*24*60*60*1000 + 1,      prev: 1,         want: '8 days ago'},
            {cur: 30*24*60*60*1000 + 1,     prev: 1,         want: 'last month'},
            {cur: 7*30*24*60*60*1000 + 1,   prev: 1,         want: '7 months ago'},
            {cur: 365*24*60*60*1000 + 1,    prev: 1,         want: 'last year'},
            {cur: 15*365*24*60*60*1000 + 1, prev: 1,         want: '15 years ago'},
        ]
            .forEach(test =>
                it(`given cur=${test.cur} and prev=${test.prev}, returns '${test.want}'`, () =>
                    expect(Utils.timeAgo(t, test.cur, test.prev)).toEqual(test.want)));
    });

    describe('joinUrl', () => {

        [
            {in: [],                        want: ''},
            {in: [''],                      want: ''},
            {in: ['/'],                     want: '/'},
            {in: ['/a'],                    want: '/a'},
            {in: ['a/'],                    want: 'a/'},
            {in: ['/a/'],                   want: '/a/'},
            {in: ['a', ''],                 want: 'a/'},
            {in: ['', 'b'],                 want: 'b'},
            {in: ['', '', '', 'b'],         want: 'b'},
            {in: ['a', 'b'],                want: 'a/b'},
            {in: ['a/', 'b'],               want: 'a/b'},
            {in: ['a', '/b'],               want: 'a/b'},
            {in: ['/a', 'b'],               want: '/a/b'},
            {in: ['/a/', 'b'],              want: '/a/b'},
            {in: ['/a', '/b'],              want: '/a/b'},
            {in: ['/a/', '/b'],             want: '/a/b'},
            {in: ['/a/', '/b/'],            want: '/a/b/'},
            {in: ['a', 'b', 'c', 'd'],      want: 'a/b/c/d'},
            {in: ['a', '/b', '/c/', 'd'],   want: 'a/b/c/d'},
            {in: ['a', '/b', '/c/', '/d'],  want: 'a/b/c/d'},
            {in: ['a', '/b', '/c/', 'd/'],  want: 'a/b/c/d/'},
            {in: ['/a', '/b', '/c/', 'd/'], want: '/a/b/c/d/'},
        ]
            .forEach(test =>
                it(`given ${JSON.stringify(test.in)}, returns '${test.want}'`, () =>
                    expect(Utils.joinUrl(...test.in)).toEqual(test.want)));
    });
});
