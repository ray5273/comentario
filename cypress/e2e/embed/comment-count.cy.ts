import { TEST_PATHS } from '../../support/cy-utils';

context('Comment count widget', () => {

    before(cy.backendReset);

    const delay = true;
    const fail  = true;

    [
        // Default path
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: ''},
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: '{',  suffix: null, 'zero-text': null}, want: '{0'},
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: null, suffix: '}',  'zero-text': null}, want: '0}'},
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: '{',  suffix: '}',  'zero-text': null}, want: '{0}'},
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': 'No'}, want: 'No'},
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: 'No'},
        {attr: {path: null, 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '...',  delay},
        {attr: {path: null, 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '0',    delay}, // Same as previous, but text changes after a while
        {attr: {path: null, 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': '()'}, want: '()',   delay}, // Idem
        {attr: {path: null, 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': ''},   want: '',     delay}, // Idem
        {attr: {path: null, 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '',     delay},
        {attr: {path: null, 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '0',    delay}, // Same as previous, but text changes after a while
        {attr: {path: null, 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': '42'}, want: '42',   delay}, // Idem
        {attr: {path: null, 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': ''},   want: '',     delay}, // Idem
        {attr: {path: null, 'error-text': null,   placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: '123',  delay},
        {attr: {path: null, 'error-text': null,   placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: 'No',   delay}, // Same as previous, but text changes after a while
        {attr: {path: null, 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: '?',    fail},
        {attr: {path: null, 'error-text': '',     placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: '',     fail},
        {attr: {path: null, 'error-text': 'ouch', placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: 'ouch', fail},
        {attr: {path: null, 'error-text': '!!!',  placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: '!!!',  fail},
        // Path of this page
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: null,  suffix: null,  'zero-text': null}, want: '0'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: '{',   suffix: null,  'zero-text': null}, want: '{0'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: null,  suffix: '}',   'zero-text': null}, want: '0}'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: '{',   suffix: '}',   'zero-text': null}, want: '{0}'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: null,  suffix: null,  'zero-text': 'No'}, want: 'No'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: null, prefix: '{',   suffix: '}',   'zero-text': 'No'}, want: 'No'},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: '$',  prefix: '{',   suffix: '}',   'zero-text': 'No'}, want: '$',   delay},
        {attr: {path: TEST_PATHS.noComment, 'error-text': null,  placeholder: '$',  prefix: '{',   suffix: '}',   'zero-text': 'No'}, want: 'No',  delay}, // Same as previous, but text changes after a while
        {attr: {path: TEST_PATHS.noComment, 'error-text': '',    placeholder: '$',  prefix: '{',   suffix: '}',   'zero-text': 'No'}, want: '',    fail},
        {attr: {path: TEST_PATHS.noComment, 'error-text': 'Err', placeholder: '$',  prefix: '{',   suffix: '}',   'zero-text': 'No'}, want: 'Err', fail},
        // Another (home) path
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: null,   prefix: null,  suffix: null,  'zero-text': null}, want: '17'},
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: null,   prefix: '[',   suffix: null,  'zero-text': null}, want: '[17'},
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: null,   prefix: null,  suffix: ']',   'zero-text': null}, want: '17]'},
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: null,   prefix: ' %(', suffix: ')% ', 'zero-text': null}, want: ' %(17)% '},
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: 'wait', prefix: ' %(', suffix: ')% ', 'zero-text': null}, want: 'wait',     delay},
        {attr: {path: TEST_PATHS.home, 'error-text': null,    placeholder: 'wait', prefix: ' %(', suffix: ')% ', 'zero-text': null}, want: ' %(17)% ', delay}, // Same as previous, but text changes after a while
        {attr: {path: TEST_PATHS.home, 'error-text': '',      placeholder: 'wait', prefix: ' %(', suffix: ')% ', 'zero-text': null}, want: '',         fail},
        {attr: {path: TEST_PATHS.home, 'error-text': 'Boom!', placeholder: 'wait', prefix: ' %(', suffix: ')% ', 'zero-text': null}, want: 'Boom!',    fail},
        // Nonexistent path
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: '{',  suffix: null, 'zero-text': null}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: null, suffix: '}',  'zero-text': null}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: '{',  suffix: '}',  'zero-text': null}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': 'No'}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: '?'},
        {attr: {path: '/nope', 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '...',  delay},
        {attr: {path: '/nope', 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '?',    delay}, // Same as previous, but text changes after a while
        {attr: {path: '/nope', 'error-text': null,   placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '?',    delay}, // Idem
        {attr: {path: '/nope', 'error-text': 'Zero', placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: 'Zero', delay}, // Idem
        {attr: {path: '/nope', 'error-text': '',     placeholder: '...', prefix: null, suffix: null, 'zero-text': null}, want: '',     delay}, // Idem
        {attr: {path: '/nope', 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '',     delay},
        {attr: {path: '/nope', 'error-text': null,   placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '?',    delay}, // Same as previous, but text changes after a while
        {attr: {path: '/nope', 'error-text': '11',   placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '11',   delay}, // Idem
        {attr: {path: '/nope', 'error-text': '',     placeholder: '',    prefix: null, suffix: null, 'zero-text': null}, want: '',     delay}, // Idem
        {attr: {path: '/nope', 'error-text': 'No',   placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': null}, want: '123',  delay},
        {attr: {path: '/nope', 'error-text': 'No',   placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': null}, want: 'No',   delay}, // Same as previous, but text changes after a while
        {attr: {path: '/nope', 'error-text': null,   placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: '?',    fail},
        {attr: {path: '/nope', 'error-text': '',     placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: '',     fail},
        {attr: {path: '/nope', 'error-text': 'ouch', placeholder: null,  prefix: null, suffix: null, 'zero-text': null}, want: 'ouch', fail},
        {attr: {path: '/nope', 'error-text': '!!!',  placeholder: '123', prefix: '{',  suffix: '}',  'zero-text': 'No'}, want: '!!!',  fail},
    ]
        .forEach(test => {
            // Prepare test name
            const ea: string[] = [];
            Object.entries(test.attr).filter(([, v]) => v !== null).forEach(([k, v]) => ea.push(`${k}='${v}'`));

            it(`given attributes {${ea.join(', ')}}, displays '${test.want}'`, () => {
                // Intercept the request, if needed
                if (test.delay || test.fail) {
                    cy.intercept(
                        {method: 'POST', url: '/api/embed/comments/counts'},
                        req => test.delay ? req.continue(res => void res.setDelay(500)) : req.reply({statusCode: 500}));
                }

                // Use the "No comment" page as the test site
                cy.testSiteVisit(TEST_PATHS.noComment);

                // Insert the element into the DOM
                cy.document().then(doc => {
                    const el = doc.createElement('comentario-count');
                    el.id = 'counter';
                    Object.entries(test.attr).forEach(([k, v]) => v === null ? el.removeAttribute(k) : el.setAttribute(k, v));
                    doc.body.insertAdjacentElement('afterbegin', el);
                });

                // Verify the displayed text
                cy.get('#counter').should('have.text', test.want);
            });
        });
});
