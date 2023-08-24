import Encodings = Cypress.Encodings;

context('Static assets', () => {

    [
        // Favicons
        {path: '/favicon.ico', dir: 'frontend', encoding: 'binary', ctype: 'image/vnd.microsoft.icon'},

        // Fonts
        {path: '/en/fonts/source-sans-300-cyrillic.woff2',     dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-cyrillic-ext.woff2', dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-greek.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-greek-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-latin.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-latin-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-300-vietnamese.woff2',   dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-cyrillic.woff2',     dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-cyrillic-ext.woff2', dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-greek.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-greek-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-latin.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-latin-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-400-vietnamese.woff2',   dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-cyrillic.woff2',     dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-cyrillic-ext.woff2', dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-greek.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-greek-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-latin.woff2',        dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-latin-ext.woff2',    dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans-700-vietnamese.woff2',   dir: 'frontend/assets/fonts', encoding: 'binary', ctype: 'font/woff2'},

        // Images
        {path: '/en/images/icon.svg',   dir: 'frontend/assets/images', encoding: 'binary', ctype: 'image/svg+xml'},
        {path: '/en/images/logo.svg',   dir: 'frontend/assets/images', encoding: 'binary', ctype: 'image/svg+xml'},
        {path: '/en/images/worker.svg', dir: 'frontend/assets/images', encoding: 'binary', ctype: 'image/svg+xml'},
    ]
        .forEach(asset => {
            it(`asset ${asset.path} is served correctly`, () => {
                cy.request({url: asset.path, encoding: asset.encoding as Encodings}).then(r => {
                    // Validate the response
                    expect(r.status).eq(200);
                    expect(r.headers['content-type']).eq(asset.ctype);

                    // Verify the contents by comparing to the source file
                    cy.readFile(`${asset.dir}/${asset.path.replace(/^.*\/([^\/]+)$/, '$1')}`, asset.encoding as Encodings)
                        .then(data => data === r.body)
                        .should('be.true');
                });
            });
        });

    it('serves comentario.js', () => {
        cy.request({url: '/comentario.js', encoding: 'utf-8'}).then(r => {
            expect(r.status).eq(200);
            expect(r.headers['content-type']).eq('text/javascript; charset=utf-8');
            expect(r.body).contains('class Comentario extends HTMLElement');
        });
    });

    it('serves comentario.css', () => {
        cy.request({url: '/comentario.css', encoding: 'utf-8'}).then(r => {
            expect(r.status).eq(200);
            expect(r.headers['content-type']).eq('text/css; charset=utf-8');
            expect(r.body).contains('.comentario-root');
        });
    });
});
