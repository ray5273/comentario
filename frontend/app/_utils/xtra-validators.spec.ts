import { FormControl } from '@angular/forms';
import { XtraValidators } from './xtra-validators';

describe('XtraValidators', () => {

    describe('host', () => {

        const ok = true;

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
});
