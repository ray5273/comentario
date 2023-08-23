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
});
