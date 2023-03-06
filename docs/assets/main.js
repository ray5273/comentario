$(document).ready(function () {

    /**
     * Initialise the scroll-to-top button
     */
    const btnScrollToTop = $('#btn-scroll-to-top');
    $(window).scroll(function() {
        btnScrollToTop.toggleClass('show', $(window).scrollTop() > 300);
    });

    btnScrollToTop.on('click', function(e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /**
     * Set up the sidebar toggler
     */
    $('#sidebar-toggler').on('click', function () {
        $('#sidebar').toggleClass('collapsed');
    });

    /**
     * Permanent link for headings.
     */
    $(':header[id]').each(function () {
        $(this).append('<a href="#' + this.id + '" class="heading-link"></a>');
    });
});
