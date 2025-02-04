import Encodings = Cypress.Encodings;

context('Static assets', () => {

    [
        // Favicons
        {path: '/android-chrome-192x192.png', dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/android-chrome-512x512.png', dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/apple-touch-icon.png',       dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/favicon.ico',                dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/vnd.microsoft.icon'},
        {path: '/favicon-16x16.png',          dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/favicon-32x32.png',          dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/icon-rss-64px.png',          dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/mstile-70x70.png',           dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/mstile-144x144.png',         dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/mstile-150x150.png',         dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/mstile-310x150.png',         dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/mstile-310x310.png',         dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/png'},
        {path: '/safari-pinned-tab.svg',      dir: 'frontend/assets/favicons', encoding: 'binary', ctype: 'image/svg+xml'},

        // Text resources
        {path: '/browserconfig.xml', dir: 'frontend/assets/misc', encoding: 'utf-8', ctype: 'text/xml; charset=utf-8'},
        {path: '/robots.txt',        dir: 'frontend/assets/misc', encoding: 'utf-8', ctype: 'text/plain; charset=utf-8'},
        {path: '/site.webmanifest',  dir: 'frontend/assets/misc', encoding: 'utf-8', ctype: 'application/manifest+json'},

        // Fonts
        // -- Source Sans
        {path: '/en/fonts/source-sans/source-sans-300-cyrillic.woff2',     dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-cyrillic-ext.woff2', dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-greek.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-greek-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-latin.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-latin-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-300-vietnamese.woff2',   dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-cyrillic.woff2',     dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-cyrillic-ext.woff2', dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-greek.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-greek-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-latin.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-latin-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-400-vietnamese.woff2',   dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-cyrillic.woff2',     dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-cyrillic-ext.woff2', dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-greek.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-greek-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-latin.woff2',        dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-latin-ext.woff2',    dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/source-sans/source-sans-700-vietnamese.woff2',   dir: 'frontend/assets/fonts/source-sans', encoding: 'binary', ctype: 'font/woff2'},
        // -- Volkhov
        {path: '/en/fonts/volkhov/volkhov-400-italic.woff2', dir: 'frontend/assets/fonts/volkhov', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/volkhov/volkhov-400-normal.woff2', dir: 'frontend/assets/fonts/volkhov', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/volkhov/volkhov-700-italic.woff2', dir: 'frontend/assets/fonts/volkhov', encoding: 'binary', ctype: 'font/woff2'},
        {path: '/en/fonts/volkhov/volkhov-700-normal.woff2', dir: 'frontend/assets/fonts/volkhov', encoding: 'binary', ctype: 'font/woff2'},

        // Images
        {path: '/en/images/icon.svg',            dir: 'frontend/assets/images',       encoding: 'binary', ctype: 'image/svg+xml'},
        {path: '/en/images/logo.svg',            dir: 'frontend/assets/images',       encoding: 'binary', ctype: 'image/svg+xml'},
        {path: '/en/images/icons/disqus.svg',    dir: 'frontend/assets/images/icons', encoding: 'binary', ctype: 'image/svg+xml'},
        {path: '/en/images/icons/wordpress.svg', dir: 'frontend/assets/images/icons', encoding: 'binary', ctype: 'image/svg+xml'},

        // Embed files
        {path: '/comentario.js',  encoding: 'utf-8', ctype: 'text/javascript; charset=utf-8', contains: 'customElements.define('},
        {path: '/comentario.css', encoding: 'utf-8', ctype: 'text/css; charset=utf-8',        contains: '.comentario-root'},
    ]
        .forEach(asset => {
            it(`asset ${asset.path} is served correctly`, () => {
                cy.request({url: asset.path, encoding: asset.encoding as Encodings}).then(r => {
                    // Validate the response
                    expect(r.status).eq(200);
                    expect(r.headers['content-type']).eq(asset.ctype);

                    // If there's a source dir provided, verify the contents by comparing to the source file
                    if (asset.dir) {
                        cy.readFile(`${asset.dir}/${asset.path.replace(/^.*\/([^/]+)$/, '$1')}`, asset.encoding as Encodings)
                            .then(data => {
                                if (typeof r.body === 'object') {
                                    expect(r.body).to.deep.equal(JSON.parse(data));
                                } else {
                                    expect(r.body).to.equal(data);
                                }
                            });

                    // If there's a content expectation, verify it
                    } else if (asset.contains) {
                        expect(r.body).contains(asset.contains);
                    }

                    // Make sure no cookies or Vary header are delivered (so the browser can cache the asset)
                    expect(r.headers['set-cookie']).undefined;
                    expect(r.headers['vary'])      .undefined;
                });
            });
        });
});
