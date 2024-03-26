import { DOMAIN_CONFIG_ITEM_KEY, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Comment Editor', () => {

    context('comment editing', () => {

        const addAnonymousComment = (clickAnonymous: boolean) => {
            // Submit a root comment. First time a Login dialog may appear
            EmbedUtils.addComment(undefined, 'This is also a root', clickAnonymous);

            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: Anonymous
                  html: <p>This is also a root</p>
                  score: 0
                  sticky: false
                  pending: true
                `);

            // Add a reply: no login dialog will appear second time
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply here!', false);

            // New comment is added, also in the Pending state
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Anonymous
                    html: <p>A reply here!</p>
                    score: 0
                    sticky: false
                    pending: true
                - author: Anonymous
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
            EmbedUtils.makeAliases({anonymous: true});

            // Verify comments
            cy.commentTree('id').should('have.length', 1);

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
            cy.commentTree('id').should('have.length', 1);

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
            cy.commentTree('id').should('have.length', 1);
        });

        it('submits anonymous comment, choosing Comment anonymously in Login dialog', () => {
            // Visit the page as anonymous
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true});

            // Add comment
            addAnonymousComment(true);
        });

        it('submits anonymous comment directly when only anonymous is enabled', () => {
            // Allow only anonymous comments
            cy.backendPatchDomain(DOMAINS.localhost.id, {authLocal: false, authSso: false});
            cy.backendUpdateDomainIdps(DOMAINS.localhost.id, []);

            // Visit the page as anonymous: there's no Login button
            cy.testSiteVisit(TEST_PATHS.comments);
            EmbedUtils.makeAliases({anonymous: true, login: false});

            // Add comment
            addAnonymousComment(false);
        });

        it('submits non-anonymous comment', () => {
            // Visit the page as anonymous
            cy.testSiteLoginViaApi(USERS.commenterOne, TEST_PATHS.comments);
            EmbedUtils.makeAliases();

            // Submit a root comment
            EmbedUtils.addComment(undefined, 'Here goes', false);

            // New comment is added, in the Pending state since anonymous comments are to be moderated
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                - author: Commenter One
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);

            // Add a reply
            EmbedUtils.addComment('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', 'A reply *here*!', false);

            // New comment is added, also in the Pending state
            cy.commentTree('html', 'author', 'score', 'sticky', 'pending').should('yamlMatch',
                // language=yaml
                `
                - author: Anonymous
                  html: <p>This is a <b>root</b>, sticky comment</p>
                  score: 0
                  sticky: true
                  pending: false
                  children:
                  - author: Commenter One
                    html: <p>A reply <em>here</em>!</p>
                    score: 0
                    sticky: false
                    pending: false
                - author: Commenter One
                  html: <p>Here goes</p>
                  score: 0
                  sticky: false
                  pending: false
                `);
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
            cy.get('@editor').find('textarea').as('textarea').should('be.focused').setValue(text);

            // Click on "Preview"
            cy.get('@editor').contains('.comentario-comment-editor-footer button', 'Preview').as('previewBtn').click()
                .should('have.class', 'comentario-btn-active');

            // The textarea is gone and a preview pane is visible
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
            cy.get('@preview') .should('not.be.visible');
            cy.get('@textarea').should('be.visible').and('be.focused').and('have.value', text);
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
            EmbedUtils.makeAliases({anonymous: true});

            // Open the editor
            cy.get('.comentario-root .comentario-add-comment-host').focus();
            cy.get('.comentario-root form.comentario-comment-editor').as('editor').should('be.visible')
                .find('.comentario-toolbar').as('toolbar');
        };

        before(cy.backendReset);

        it('shows buttons based on domain config', () => {
            const btns = [
                'Bold', 'Italic', 'Strikethrough', 'Link', 'Quote', 'Code', 'Image', 'Table', 'Bullet list',
                'Numbered list', 'Markdown help'];

            // Check titles of all buttons
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn').attrValues('title').should('arrayMatch', btns);

            // Disable links and the Link button is gone
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownLinksEnabled, false);
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn').attrValues('title')
                .should('arrayMatch', btns.filter(b => b !== 'Link'));
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownLinksEnabled, true);

            // Disable images and the Image button is gone
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownImagesEnabled, false);
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn').attrValues('title')
                .should('arrayMatch', btns.filter(b => b !== 'Image'));
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownImagesEnabled, true);

            // Disable tables and the Table button is gone
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownTablesEnabled, false);
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn').attrValues('title')
                .should('arrayMatch', btns.filter(b => b !== 'Table'));
            cy.backendUpdateDomainConfigItem(DOMAINS.localhost.id, DOMAIN_CONFIG_ITEM_KEY.markdownTablesEnabled, true);
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
                        cy.get('@toolbar').find(`.comentario-btn[title='${button}']`).click();

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

        it('has Markdown help button', () => {
            visitAndEdit();
            cy.get('@toolbar').find('.comentario-btn[title="Markdown help"]')
                .should(
                    'be.anchor',
                    'https://edge.docs.comentario.app/en/kb/markdown/',
                    {newTab: true, noOpener: true, noReferrer: false, noFollow: false});
        });
    });
});
