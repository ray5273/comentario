import { FormControl } from '@angular/forms';
import { XtraValidators } from './xtra-validators';

describe('XtraValidators', () => {

    const ok = true;

    describe('host', () => {

        [
            // Good
            {ok, in: null},
            {ok, in: false},
            {ok, in: ''},
            {ok, in: 'a'},
            {ok, in: '1'},
            {ok, in: '1a'},
            {ok, in: 'zz'},
            {ok, in: 'abc'},
            {ok, in: 'a.b'},
            {ok, in: 'a-b'},
            {ok, in: '1-a'},
            {ok, in: 'a-1'},
            {ok, in: '1e.to'},
            {ok, in: 'a.b.c.d.e.f.g.h.i.j.k.l.m'},
            {ok, in: '127.0.0.1'},
            {ok, in: '127.0.0.1:80'},
            {ok, in: 'a'.repeat(63)},
            {ok, in: '1'.repeat(63)},
            {ok, in: 'comentario.app'},
            {ok, in: 'subdomain.subdomain.subdomain.subdomain.subdomain.subdomain.subdomain.comentario.app'},
            {ok, in: 'comentario.app:8080'},
            {ok, in: 'subdomain.subdomain.subdomain.subdomain.subdomain.subdomain.subdomain.comentario.app:1'},

            // Bad
            {in: '!'},
            {in: '@'},
            {in: '#'},
            {in: '$'},
            {in: '^'},
            {in: '&'},
            {in: '*'},
            {in: '('},
            {in: ')'},
            {in: '-'},
            {in: '='},
            {in: '_'},
            {in: '+'},
            {in: '`'},
            {in: '~'},
            {in: '\''},
            {in: '"'},
            {in: ':'},
            {in: ';'},
            {in: '<'},
            {in: '>'},
            {in: ','},
            {in: '/'},
            {in: '?'},
            {in: '|'},
            {in: '\x00'},
            {in: 'a.'},
            {in: '.'},
            {in: '.a'},
            {in: '1.'},
            {in: '.1'},
            {in: 'a-'},
            {in: '-a'},
            {in: 'a_'},
            {in: 'a_b'},
            {in: '_b'},
            {in: 'a/'},
            {in: 'a/b'},
            {in: 'a'.repeat(64)},
            {in: '1'.repeat(64)},
            {in: 'comentario.app:'},
            {in: 'comentario.app:123456'},
        ]
            .forEach(t => it(
                `given '${t.in}', validates to ${t.ok ?? false}`,
                () => expect(XtraValidators.host(new FormControl(t.in))).toEqual(t.ok ? null : jasmine.truthy())));
    });

    describe('maxSize', () => {

        [
            // Good
            {ok, max: 42, in: undefined},
            {ok, max: 42, in: null},
            {ok, max: 42, in: false},
            {ok, max: 42, in: true},
            {ok, max: 42, in: {}},
            {ok, max: 42, in: 'x'},
            {ok, max: 42, in: NaN},
            {ok, max: 42, in: 0},
            {ok, max: 42, in: 41},
            {ok, max: 42, in: 42},

            // Bad
            {max: 42, in: 43},
            {max: 42, in: 999999999},
        ]
            .forEach(t => it(
                `given size ${t.in}, validates to ${t.ok ?? false}`,
                () => expect(XtraValidators.maxSize(t.max)(new FormControl({size: t.in}))).toEqual(t.ok ? null : jasmine.truthy())));
    });

    describe('url', () => {

        [
            // Good
            {ok, secure: false, in: undefined},
            {ok, secure: true,  in: null},
            {ok, secure: false, in: undefined},
            {ok, secure: true,  in: null},
            {ok, secure: false, in: ''},
            {ok, secure: true,  in: ''},
            {ok, secure: false, in: 'http://a'},
            {ok, secure: false, in: 'https://a'},
            {ok, secure: true,  in: 'https://a'},
            {ok, secure: false, in: 'http://'  + 'a'.repeat(2076)},
            {ok, secure: false, in: 'https://' + 'a'.repeat(2076)},
            {ok, secure: true,  in: 'https://' + 'a'.repeat(2076)},

            // Bad
            {secure: false, in: false},
            {secure: false, in: true},
            {secure: false, in: {}},
            {secure: false, in: 'h'},
            {secure: false, in: 'ht'},
            {secure: false, in: 'htt'},
            {secure: false, in: 'http'},
            {secure: false, in: 'http:'},
            {secure: false, in: 'http:/'},
            {secure: false, in: 'http://'},
            {secure: true,  in: 'http://'},
            {secure: false, in: 'https://'},
            {secure: true,  in: 'https://'},
            {secure: true,  in: 'http://a'},
            {secure: false, in: 'http://'  + 'a'.repeat(2077)},
            {secure: true,  in: 'https://' + 'a'.repeat(2077)},
        ]
            .forEach(t => it(
                `given '${t.in}', validates to ${t.ok ?? false}`,
                () => expect(XtraValidators.url(t.secure)(new FormControl(t.in))).toEqual(t.ok ? null : jasmine.truthy())));
    });

    describe('hasProperty', () => {

        [
            // Good
            {ok, prop: 'foo', in: {foo: 'bar'}},
            {ok, prop: 'foo', in: {foo: 42}},

            // Bad
            {prop: 'foo', in: undefined},
            {prop: 'foo', in: null},
            {prop: 'foo', in: false},
            {prop: 'foo', in: true},
            {prop: 'foo', in: 'x'},
            {prop: 'foo', in: NaN},
            {prop: 'foo', in: 0},
            {prop: 'foo', in: {}},
            {prop: 'foo', in: {bar: 'foo'}},
            {prop: 'foo', in: {foo: ''}},
            {prop: 'foo', in: {foo: false}},
            {prop: 'foo', in: {foo: 0}},
            {prop: 'foo', in: {foo: undefined}},
            {prop: 'foo', in: {foo: null}},
        ]
            .forEach(t => it(
                `given value ${t.in}, validates to ${t.ok ?? false}`,
                () => expect(XtraValidators.hasProperty(t.prop)(new FormControl(t.in))).toEqual(t.ok ? null : jasmine.truthy())));
    });
});
