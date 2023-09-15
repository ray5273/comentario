/** Paths in the administration UI. */
export const PATHS = {
    home: '/en/',

    auth: {
        login:          '/en/auth/login',
        signup:         '/en/auth/signup',
        forgotPassword: '/en/auth/forgotPassword',
        resetPassword:  '/en/auth/resetPassword',
    },

    manage: {
        dashboard: '/en/manage/dashboard',
    }
};

/** Paths for the test site. */
export const TEST_PATHS = {
    home:      '/',
    comments:  '/comments/',
    double:    '/double/',
    dynamic:   '/dynamic/',
    noComment: '/nocomment/',
    readonly:  '/readonly/',

    attr: {
        autoInit:         '/attr/auto-init/',
        noFonts:          '/attr/no-fonts/',
        cssOverride:      '/attr/css-override/',
        cssOverrideFalse: '/attr/css-override-false/',
        pageId:           '/attr/page-id/',
    },
};
