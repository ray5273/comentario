$(document).ready(function () {

    /**
     * Initialise the scroll-to-top button
     */
    const btnScrollToTop = $('#btn-scroll-to-top');
    $(window).scroll(() => btnScrollToTop.toggleClass('show', $(window).scrollTop() > 300));

    btnScrollToTop.on('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /**
     * Set up the sidebar toggler
     */
    $('#sidebar-toggler,.sidebar-backdrop').on('click', () => {
        $('.sidebar-container').toggleClass('collapsed');
        $('body').toggleClass('overflow-hidden');
    });

    /**
     * Permanent link for headings.
     */
    $(':header[id]').each((_, el) => $(el).append('<a href="#' + el.id + '" class="heading-link"></a>'));

    /**
     * Contact form validation.
     */
    $('#contact-submit-button').on('click', function (e) {
        const contactForm = $('#contact-form');
        if (contactForm[0].checkValidity() === false) {
            // Stop the form from being submitted
            e.preventDefault();
            e.stopPropagation();
        }
        contactForm.addClass('was-validated');
    });

    /**
     * Debounce the passed handler function.
     */
    function debounce(delay, handler) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            const later = function () {
                timeout = null;
                handler.apply(context, args);
            };
            timeout && clearTimeout(timeout);
            timeout = setTimeout(later, delay);
        };
    }

    /**
     * Site search.
     */
    $("#search-query").on('input', debounce(500, search));
    const $searchResults   = $('#search-results');
    const $searchNoResults = $('#no-search-results');

    /** Cached index file. */
    let searchIndex;

    function search() {
        // Remove all results
        $searchResults.html('').toggleClass('d-none', true);
        $searchNoResults.toggleClass('d-none', true);

        // If no search query, no need to search
        const query = $(this).val();
        if (query) {
            // Fetch the index file, if not already loaded
            if (searchIndex) {
                doSearch(query);
            } else {
                $.getJSON("/en/index.json", data => {
                    searchIndex = data;
                    doSearch(query);
                });
            }
        }
    }

    /**
     * Return a snippet of text from a string, up to 100 characters long.
     * @param text Original article text.
     * @param idx Index where the first occurrence was found.
     * @returns {string} HTML snippet.
     */
    function searchSnippet(text, idx) {
        // Identify the start position, trying to find a word boundary
        let start = (!idx || idx < 100) ? 0 : idx - 100;
        while (start > 0 && text[start].match(/\w/)) {
            start--;
        }

        // Identify the end position, trying to find a word boundary
        let end = (idx || 0) + 100;
        while (end < text.length && text[end].match(/\w/)) {
            end++;
        }

        return (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
    }

    /**
     * Mark all occurrences of a query in a text.
     * @param text Text to search.
     * @param queryLower Search query in lowercase.
     */
    function searchMark(text, queryLower) {
        const tl = text.toLowerCase();
        const qLen = queryLower.length;

        // Find all query matches
        let i;
        let idxStart = 0;
        let offset = 0;
        while ((i = tl.indexOf(queryLower, idxStart)) > -1) {
            // Mark the occurrence
            const iOffset = i + offset;
            text = text.substring(0, iOffset) +
                '<mark>' +
                text.substring(iOffset, iOffset + qLen) +
                '</mark>' +
                text.substring(iOffset + qLen);

            // With each match, the offset grows by the length of the added '<mark></mark>' markup
            offset += 13;
            idxStart = i + qLen;
        }
        return text;
    }

    function doSearch(query) {
        query = query.toLowerCase();
        const matches = [];
        searchIndex.forEach(item => {
            let idx;
            if ((idx = item.text.toLowerCase().indexOf(query)) >= 0) {
                item.pos = idx;
                matches.push(item);
            } else if (item.title.toLowerCase().includes(query) || item.tags?.some(s => s.toLowerCase().includes(query))) {
                matches.push(item);
            }
        });

        // Render the results
        matches.forEach((item, index) => {
            // Prepare tags
            let tags = item.tags?.map(s => `<span class="me-2">${searchMark(s, query)}</span>`).join('');
            if (tags) {
                tags = `<div class="card-footer small text-muted">${tags}</div>`;
            }

            // Add a result card
            $searchResults.append(`
                <a href="${item.link}" id="search-result-${index}" class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${searchMark(item.title, query)}</h5>
                        <p>${(searchMark(searchSnippet(item.text, item.pos), query))}</p>
                    </div>
                    ${tags}
                </a>
            `);
        });

        // Show or hide elements based on the presence of matches
        const found = !!matches.length;
        $searchNoResults.toggleClass('d-none', found);
        $searchResults.toggleClass('d-none', !found);
    }
});
