// Known UI paths
export const Paths = {
    home: '/',

    // Auth
    auth: {
        forgotPassword: '/auth/forgotPassword',
        login:          '/auth/login',
        resetPassword:  '/auth/resetPassword',
        signup:         '/auth/signup',
    },

    // Control Center
    manage: {
        dashboard:      '/manage/dashboard',
        domains:        '/manage/domains',
        users:          '/manage/users',
        config: {
            _:          '/manage/config',
            static:     '/manage/config/static',
            dynamic:    '/manage/config/dynamic',
        },

        // Account
        account: {
            profile:    '/manage/account/profile',
        },
    },
};
