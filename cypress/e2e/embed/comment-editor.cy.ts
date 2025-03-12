import { DomainConfigKey, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Comment Editor', () => {

    context('comment editing', () => {

        const addUnregisteredComments = (clickUnregistered: boolean, authorName?: string) => {
            // Submit a root comment. First time a Login dialog may appear
            EmbedUtils.addComment(undefined, 'This is also a root', clickUnregistered, authorName);

            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: ${authorName ?? 'Anonymous'}
                  subtitle: just now
                  html: <p>This is also a root</p>
                  score: 0
                  sticky: false
                  pending: true
                `);

            // Add a reply: no login dialog will appear second time
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply here!', false, authorName);

            // New comment is added, also in the Pending state
            cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: ${authorName ?? 'Anonymous'}
                    subtitle: just now
                    html: <p>A reply here!</p>
                    score: 0
                    sticky: false
                    pending: true
                - author: ${authorName ?? 'Anonymous'}
                  subtitle: just now
                  html: <p>This is also a root</p>
                  score: 0
                  sticky: false
                  pending: true
                `);
        };

        beforeEach(cy.backendReset);

        it('can be entered and canceled', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true, numComments: 1});

            // Verify comments
            cy.commentTree().should('have.length', 1);

            // Focus the host, the editor should be inserted
            cy.get('@addCommentHost').focus()
                .should('have.class', 'comentario-editor-inserted')
                .find('form').as('editor').should('be.visible')
                .find('textarea').should('be.focused').should('have.value', '')
                // Type some text, then press Esc, and the editor's gone
                .type('Hi there{esc}');
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree().should('have.length', 1);
            EmbedUtils.checkNumComments(1);

            // Open the editor by clicking it
            cy.get('@addCommentHost').click()
                // The value is reset
                .find('form textarea').as('textarea').should('be.focused').and('have.value', '')
                // Test validation: try to submit an empty comment
                .type('{ctrl+enter}')
                    .should('have.class', 'comentario-touched')
                    .should('match', ':invalid')
                    .should('not.match', ':valid')
                // Type in some text
                .type('Hey')
                    .should('not.match', ':invalid')
                    .should('match', ':valid');

            // Click on Cancel, the editor is gone again
            cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Cancel').click();
            cy.get('@editor').should('not.exist');
            cy.get('@addCommentHost').should('not.have.class', 'comentario-editor-inserted');

            // Still one comment
            cy.commentTree().should('have.length', 1);
            EmbedUtils.checkNumComments(1);
        });

        context('submission', () => {

            beforeEach(() => {
                // Open the test page
                cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);
                EmbedUtils.makeAliases();
            });

            it('disables controls while submitting', () => {
                // Simulate a slow API response
                cy.intercept(
                    {method: 'PUT', url: '/api/embed/comments'},
                    req => req.continue(res => void res.setDelay(2000))).as('apiComments');

                // Add a comment
                cy.get('.comentario-root .comentario-add-comment-host').focus();
                cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');
                cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue('Let\'s wait').type('{ctrl+enter}');

                // All controls should be disabled now
                cy.get('@editor').find('.comentario-toolbar').should('have.class', 'comentario-disabled');
                cy.get('@textarea').should('be.disabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Cancel')     .should('be.disabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview')    .should('be.disabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Add Comment').should('be.disabled');

                // Wait for the request to finish: the editor's gone
                cy.wait('@apiComments');
                cy.get('@editor').should('not.exist');
            });

            it('re-enables controls on failure', () => {
                // Simulate an API failure
                cy.intercept({method: 'PUT', url: '/api/embed/comments'}, {forceNetworkError: true}).as('apiComments');

                // Add a comment
                cy.get('.comentario-root .comentario-add-comment-host').focus();
                cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');
                cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue('About to crash').type('{ctrl+enter}');

                // Wait for the request to finish
                cy.wait('@apiComments');

                // There's an error notice
                cy.testSiteCheckMessage('Error: Unknown error.', false);

                // The editor's still there and all controls re-enabled
                cy.get('@editor').find('.comentario-toolbar').should('not.have.class', 'comentario-disabled');
                cy.get('@textarea').should('be.enabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Cancel')     .should('be.enabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview')    .should('be.enabled');
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Add Comment').should('be.enabled');
            });
        });

        context('without registration', () => {

            it('submits anonymous comment, confirming in Login dialog', () => {
                cy.testSiteVisit(TEST_PATHS.comments);
                EmbedUtils.makeAliases({anonymous: true, numComments: 1});
                addUnregisteredComments(true);
                EmbedUtils.checkNumComments(3);
            });

            it('submits anonymous comment, skipping Login dialog', () => {
                // Turn off the login dialog for unauthenticated user
                cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.showLoginForUnauth]: false});

                // Submit a comment: no login dialog expected and the comment is added right away
                cy.testSiteVisit(TEST_PATHS.comments);
                EmbedUtils.makeAliases({anonymous: true, numComments: 1});
                addUnregisteredComments(false);
                EmbedUtils.checkNumComments(3);
            });

            it('submits comment with a name', () => {
                cy.testSiteVisit(TEST_PATHS.comments);
                EmbedUtils.makeAliases({anonymous: true, numComments: 1});
                addUnregisteredComments(true, 'Bambarbia Kirgudu');
                EmbedUtils.checkNumComments(3);
            });

            it('submits comment with a name when only unregistered is enabled', () => {
                // Allow only anonymous comments
                cy.backendPatchDomain(DOMAINS.localhost.id, {authLocal: false, authSso: false});
                cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);

                // Visit the page as anonymous
                cy.testSiteVisit(TEST_PATHS.comments);
                EmbedUtils.makeAliases({anonymous: true, numComments: 1});
                addUnregisteredComments(true, 'Bambarbia Kirgudu');
                EmbedUtils.checkNumComments(3);
            });

            it('allows to preview comment text', () => {
                // Visit the page as anonymous
                cy.testSiteVisit(TEST_PATHS.comments);
                EmbedUtils.makeAliases({anonymous: true});

                // Open editor and add text
                const text = '## Apples and oranges\n\n' +
                    '* Apples\n' +
                    '* Oranges\n\n' +
                    '```bash\n' +
                    'echo "I\'m a code block"\n' +
                    '```';
                cy.get('.comentario-root .comentario-add-comment-host').focus();
                cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible');
                cy.get('@editor').find('.comentario-toolbar').as('toolbar');
                cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue(text);

                // Click on "Preview"
                cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview').as('previewBtn').click()
                    .should('have.class', 'comentario-btn-active');

                // The toolbar is disabled, the textarea is gone and a preview pane is visible
                cy.get('@toolbar') .should('have.class', 'comentario-disabled');
                cy.get('@textarea').should('not.be.visible');
                cy.get('@editor').find('.comentario-comment-editor-preview').as('preview')
                    .should('be.visible')
                    .invoke('html').should('eq',
                    '<h2>Apples and oranges</h2>\n' +
                    '<ul>\n' +
                    '<li>Apples</li>\n' +
                    '<li>Oranges</li>\n' +
                    '</ul>\n' +
                    '<pre><code>echo "I\'m a code block"\n</code></pre>\n');

                // Deactivate the preview: the editor's back and the preview gone
                cy.get('@previewBtn').click().should('not.have.class', 'comentario-btn-active');
                cy.get('@toolbar') .should('not.have.class', 'comentario-disabled');
                cy.get('@preview') .should('not.be.visible');
                cy.get('@textarea').should('be.visible').and('be.focused').and('have.value', text);
            });
        });

        it('submits non-anonymous comment', () => {
            // Visit the page as commenter
            cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);
            EmbedUtils.makeAliases({numComments: 1});

            // Submit a root comment
            EmbedUtils.addComment(undefined, 'Here goes', false);

            // New comment is added, NOT in the Pending state
            EmbedUtils.checkNumComments(2);
            cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: Commenter One
                  subtitle: just now
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);

            // Add a reply
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply *here*!', false);

            // New comment is added, also not in the Pending state
            EmbedUtils.checkNumComments(3);
            cy.commentTree('html', 'author', 'subtitle', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  subtitle: 3 hours ago
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Commenter One
                    subtitle: just now
                    html: <p>A reply <em>here</em>!</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Commenter One
                  subtitle: just now
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);
        });

        it('limits comment length', () => {
            // Visit the page as commenter
            cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);

            // Make predefined-length strings
            const x4094  = 'x '.repeat(2047);
            const x139   = 'ab '.repeat(46) + 'c';
            const x99999 = '9 letters'.repeat(11_111);

            const postComment = (text: string, extraChars: string, wantLength: number, numBefore: number, numAfter: number) => {
                EmbedUtils.makeAliases({numComments: numBefore});
                cy.get('@addCommentHost').click();
                cy.get('@mainArea').find('textarea').as('textarea').setValue(text).type(extraChars)
                    .invoke('val').should('have.length', wantLength);
                cy.get('@textarea').type('{ctrl+enter}');
                EmbedUtils.checkNumComments(numAfter);
            };

            // Input 4097 chars: the input is capped at 4096
            postComment(x4094, 'abc', 4096, 1, 2);
            cy.commentTree('html', 'author').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                - author: Commenter One
                  html: <p>${x4094}ab</p>
                `);

            // Lower the limit of the comment length
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.maxCommentLength]: 140});
            cy.reload();

            // Input 141 chars: the input is capped at 140
            postComment(x139, 'xyz', 140, 2, 3);
            cy.commentTree('html', 'author').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                - author: Commenter One
                  html: <p>${x4094}ab</p>
                - author: Commenter One
                  html: <p>${x139}x</p>
                `);

            // Now raise the limit
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.maxCommentLength]: 100_000});
            cy.reload();

            // Input 100K+1 chars: the input is capped at 100K
            postComment(x99999, 'qwe', 100_000, 3, 4);
            cy.commentTree('html', 'author').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                - author: Commenter One
                  html: <p>${x4094}ab</p>
                - author: Commenter One
                  html: <p>${x139}x</p>
                - author: Commenter One
                  html: <p>${x99999}q</p>
                `);

            // Stress test: raise the limit to the maximum 1M, and submit a comment directly via API
            const s1M = 'abcdefghi '.repeat(104_857) + '123456';
            cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.maxCommentLength]: 1_048_576});
            cy.commentAddViaApi(DOMAINS.localhost.host, TEST_PATHS.comments, null, s1M);

            // Don't need to reload because of the Live Update
            EmbedUtils.checkNumComments(5);
            cy.commentTree('html', 'author').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                - author: Commenter One
                  html: <p>${x4094}ab</p>
                - author: Commenter One
                  html: <p>${x139}x</p>
                - author: Commenter One
                  html: <p>${x99999}q</p>
                - author: Commenter One
                  html: <p>${s1M}</p>
                `);
        });
    });

    context('toolbar', () => {

        const tblBody = '\n|---------|---------|\n| Text    | Text    |\n';

        const buttonTests = {
            'Bold' : [
                {in: '',         sel: [0],    want: '**text**',                              wantSel: [2, 6],  wantHtml: '<p><strong>text</strong></p>'},
                {in: 'foo',      sel: [0],    want: '**text**foo',                           wantSel: [2, 6],  wantHtml: '<p><strong>text</strong>foo</p>'},
                {in: 'foo',      sel: [2, 2], want: 'fo**text**o',                           wantSel: [4, 8],  wantHtml: '<p>fo<strong>text</strong>o</p>'},
                {in: 'foo',      sel: [0, 3], want: '**foo**',                               wantSel: [7, 7],  wantHtml: '<p><strong>foo</strong></p>'},
            ],
            'Italic' : [
                {in: '',         sel: [0],    want: '*text*',                                wantSel: [1, 5],  wantHtml: '<p><em>text</em></p>'},
                {in: 'foo',      sel: [0],    want: '*text*foo',                             wantSel: [1, 5],  wantHtml: '<p><em>text</em>foo</p>'},
                {in: 'foo',      sel: [2, 2], want: 'fo*text*o',                             wantSel: [3, 7],  wantHtml: '<p>fo<em>text</em>o</p>'},
                {in: 'foo',      sel: [0, 3], want: '*foo*',                                 wantSel: [5, 5],  wantHtml: '<p><em>foo</em></p>'},
            ],
            'Strikethrough' : [
                {in: '',         sel: [0],    want: '~~text~~',                              wantSel: [2, 6],  wantHtml: '<p><del>text</del></p>'},
                {in: 'foo',      sel: [0],    want: '~~text~~foo',                           wantSel: [2, 6],  wantHtml: '<p><del>text</del>foo</p>'},
                {in: 'foo',      sel: [2, 2], want: 'fo~~text~~o',                           wantSel: [4, 8],  wantHtml: '<p>fo<del>text</del>o</p>'},
                {in: 'foo',      sel: [0, 3], want: '~~foo~~',                               wantSel: [7, 7],  wantHtml: '<p><del>foo</del></p>'},
            ],
            'Link' : [
                {in: '',         sel: [0],    want: '[text](https://example.com)',           wantSel: [1, 5],  wantHtml: '<p><a href="https://example.com" rel="nofollow noopener" target="_blank">text</a></p>'},
                {in: 'bar',      sel: [0],    want: '[text](https://example.com)bar',        wantSel: [1, 5],  wantHtml: '<p><a href="https://example.com" rel="nofollow noopener" target="_blank">text</a>bar</p>'},
                {in: 'bar',      sel: [2, 2], want: 'ba[text](https://example.com)r',        wantSel: [3, 7], wantHtml: '<p>ba<a href="https://example.com" rel="nofollow noopener" target="_blank">text</a>r</p>'},
                {in: 'bar',      sel: [0, 3], want: '[bar](https://example.com)',            wantSel: [6, 25], wantHtml: '<p><a href="https://example.com" rel="nofollow noopener" target="_blank">bar</a></p>'},
            ],
            'Quote' : [
                {in: '',         sel: [0],    want: '> ',                                    wantSel: [2, 2],  wantHtml: '<blockquote></blockquote>'},
                {in: 'zip',      sel: [0],    want: '> zip',                                 wantSel: [2, 2],  wantHtml: '<blockquote><p>zip</p></blockquote>'},
                {in: 'zip',      sel: [2, 2], want: '> zip',                                 wantSel: [4, 4],  wantHtml: '<blockquote><p>zip</p></blockquote>'},
                {in: 'zip',      sel: [3, 3], want: '> zip',                                 wantSel: [5, 5],  wantHtml: '<blockquote><p>zip</p></blockquote>'},
                {in: 'zip',      sel: [1, 2], want: '> zip',                                 wantSel: [3, 3],  wantHtml: '<blockquote><p>zip</p></blockquote>'},
                {in: 'zip',      sel: [0, 3], want: '> zip',                                 wantSel: [2, 2],  wantHtml: '<blockquote><p>zip</p></blockquote>'},
                {in: 'zip\nrar', sel: [0, 3], want: '> zip\nrar',                            wantSel: [2, 2],  wantHtml: '<blockquote><p>zip<br>rar</p></blockquote>'},
                {in: 'zip\nrar', sel: [0, 7], want: '> zip\n> rar',                          wantSel: [2, 2],  wantHtml: '<blockquote><p>zip<br>rar</p></blockquote>'},
                {in: 'zip\nrar', sel: [1, 5], want: '> zip\n> rar',                          wantSel: [3, 3],  wantHtml: '<blockquote><p>zip<br>rar</p></blockquote>'},
            ],
            'Code' : [
                {in: '',         sel: [0],    want: '`text`',                                wantSel: [1, 5],  wantHtml: '<p><code>text</code></p>'},
                {in: 'var',      sel: [0],    want: '`text`var',                             wantSel: [1, 5],  wantHtml: '<p><code>text</code>var</p>'},
                {in: 'var',      sel: [2, 2], want: 'va`text`r',                             wantSel: [3, 7],  wantHtml: '<p>va<code>text</code>r</p>'},
                {in: 'var',      sel: [0, 3], want: '`var`',                                 wantSel: [5, 5],  wantHtml: '<p><code>var</code></p>'},
            ],
            'Image' : [
                {in: '',         sel: [0],    want: '![](https://example.com/image.png)',    wantSel: [4, 33], wantHtml: '<p><img src="https://example.com/image.png" alt=""></p>'},
                {in: 'bar',      sel: [0],    want: '![](https://example.com/image.png)bar', wantSel: [4, 33], wantHtml: '<p><img src="https://example.com/image.png" alt="">bar</p>'},
                {in: 'bar',      sel: [2, 2], want: 'ba![](https://example.com/image.png)r', wantSel: [6, 35], wantHtml: '<p>ba<img src="https://example.com/image.png" alt="">r</p>'},
                {in: 'bar',      sel: [0, 3], want: '![](bar)',                              wantSel: [8, 8],  wantHtml: '<p><img src="bar" alt=""></p>'},
            ],
            'Table' : [
                {in: '',         sel: [0],    want: '\n| Heading | Heading |'+tblBody,       wantSel: [3, 10], wantHtml: '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Text</td><td>Text</td></tr></tbody></table>'},
                {in: 'boo',      sel: [0],    want: '\n| Heading | Heading |'+tblBody+'boo', wantSel: [3, 10], wantHtml: '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Text</td><td>Text</td></tr><tr><td>boo</td><td></td></tr></tbody></table>'},
                {in: 'boo',      sel: [0, 3], want: '\n| boo | Heading |'+tblBody,           wantSel: [9, 16], wantHtml: '<table><thead><tr><th>boo</th><th>Heading</th></tr></thead><tbody><tr><td>Text</td><td>Text</td></tr></tbody></table>'},
            ],
            'Bullet list' : [
                {in: '',         sel: [0],    want: '* ',                                    wantSel: [2, 2],  wantHtml: '<ul><li></li></ul>'},
                {in: 'zip',      sel: [0],    want: '* zip',                                 wantSel: [2, 2],  wantHtml: '<ul><li>zip</li></ul>'},
                {in: 'zip',      sel: [2, 2], want: '* zip',                                 wantSel: [4, 4],  wantHtml: '<ul><li>zip</li></ul>'},
                {in: 'zip',      sel: [3, 3], want: '* zip',                                 wantSel: [5, 5],  wantHtml: '<ul><li>zip</li></ul>'},
                {in: 'zip',      sel: [1, 2], want: '* zip',                                 wantSel: [3, 3],  wantHtml: '<ul><li>zip</li></ul>'},
                {in: 'zip',      sel: [0, 3], want: '* zip',                                 wantSel: [2, 2],  wantHtml: '<ul><li>zip</li></ul>'},
                {in: 'zip\nrar', sel: [0, 3], want: '* zip\nrar',                            wantSel: [2, 2],  wantHtml: '<ul><li>zip<br>rar</li></ul>'},
                {in: 'zip\nrar', sel: [0, 7], want: '* zip\n* rar',                          wantSel: [2, 2],  wantHtml: '<ul><li>zip</li><li>rar</li></ul>'},
                {in: 'zip\nrar', sel: [1, 5], want: '* zip\n* rar',                          wantSel: [3, 3],  wantHtml: '<ul><li>zip</li><li>rar</li></ul>'},
            ],
            'Numbered list' : [
                {in: '',         sel: [0],    want: '1. ',                                   wantSel: [3, 3],  wantHtml: '<ol><li></li></ol>'},
                {in: 'zip',      sel: [0],    want: '1. zip',                                wantSel: [3, 3],  wantHtml: '<ol><li>zip</li></ol>'},
                {in: 'zip',      sel: [2, 2], want: '1. zip',                                wantSel: [5, 5],  wantHtml: '<ol><li>zip</li></ol>'},
                {in: 'zip',      sel: [3, 3], want: '1. zip',                                wantSel: [6, 6],  wantHtml: '<ol><li>zip</li></ol>'},
                {in: 'zip',      sel: [1, 2], want: '1. zip',                                wantSel: [4, 4],  wantHtml: '<ol><li>zip</li></ol>'},
                {in: 'zip',      sel: [0, 3], want: '1. zip',                                wantSel: [3, 3],  wantHtml: '<ol><li>zip</li></ol>'},
                {in: 'zip\nrar', sel: [0, 3], want: '1. zip\nrar',                           wantSel: [3, 3],  wantHtml: '<ol><li>zip<br>rar</li></ol>'},
                {in: 'zip\nrar', sel: [0, 7], want: '1. zip\n1. rar',                        wantSel: [3, 3],  wantHtml: '<ol><li>zip</li><li>rar</li></ol>'},
                {in: 'zip\nrar', sel: [1, 5], want: '1. zip\n1. rar',                        wantSel: [4, 4],  wantHtml: '<ol><li>zip</li><li>rar</li></ol>'},
            ],
        };

        const visitAndEdit = () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true, numComments: 1});

            // Open the editor
            cy.get('.comentario-root .comentario-add-comment-host').focus();
            cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible')
                .find('.comentario-toolbar').as('toolbar');
        };

        before(cy.backendReset);

        it('shows buttons based on domain config', () => {
            const btns = [
                'Bold (Ctrl+B)', 'Italic (Ctrl+I)', 'Strikethrough (Ctrl+Shift+X)', 'Link (Ctrl+K)',
                'Quote (Ctrl+Shift+.)', 'Code (Ctrl+E)', 'Image', 'Table', 'Bullet list (Ctrl+Shift+8)',
                'Numbered list (Ctrl+Shift+7)', 'Editor help'];

            /** Disable the given config value, visit the site and check the toolbar buttons. */
            const checkSetting = (key: string, hidesButton: string) => {
                // Disable the domain setting and check
                cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[key]: false});
                visitAndEdit();
                cy.get('@toolbar').find('.comentario-btn').attrValues('title')
                    .should('arrayMatch', btns.filter(b => !b.startsWith(hidesButton)));

                // Revert the domain setting
                cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[key]: true});
            };

            // Check titles of all buttons
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn').attrValues('title').should('arrayMatch', btns);

            // Disable links and the Link button is gone
            checkSetting(DomainConfigKey.markdownLinksEnabled, 'Link');

            // Disable images and the Image button is gone
            checkSetting(DomainConfigKey.markdownImagesEnabled, 'Image');

            // Disable tables and the Table button is gone
            checkSetting(DomainConfigKey.markdownTablesEnabled, 'Table');
        });

        Object.entries(buttonTests).forEach(([button, btnTests]) =>
            context(`button '${button}'`, () =>
                btnTests.forEach(test =>
                    it(`handles text '${test.in}' and selection ${JSON.stringify(test.sel)}`, () => {
                        // Visit the page and open the editor
                        visitAndEdit();

                        // Put the text into the editor
                        cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue(test.in)
                            // Select the required part
                            .then((ta: JQuery<HTMLInputElement>) =>
                                ta[0].setSelectionRange(test.sel[0], test.sel[1]));

                        // Click the button
                        cy.get('@toolbar').find(`.comentario-btn[title^='${button}']`).click();

                        // Verify the editor
                        cy.get('@textarea')
                            .should('have.value', test.want)
                            .should((ta: JQuery<HTMLInputElement>) => {
                                expect(ta[0].selectionStart).eq(test.wantSel[0]);
                                expect(ta[0].selectionEnd)  .eq(test.wantSel[1]);
                            });

                        // Click on "Preview" and verify its content
                        cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview').click();
                        cy.get('@editor').find('.comentario-comment-editor-preview').invoke('html')
                            // Clean up all linebreaks as they are irrelevant in the produced HTML
                            .invoke('replaceAll', '\n', '')
                            .should('eq', test.wantHtml);
                    }))));

        it('has Editor help button', () => {
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn[title="Editor help"]')
                .should(
                    'be.anchor',
                    'https://edge.docs.comentario.app/en/kb/comment-editor/',
                    {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
        });
    });
});
