// Known UI paths
import { User } from '../../generated-api';

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
        domainCreate:   '/manage/domains/create',
        users:          '/manage/users',
        config: {
            _:          '/manage/config',
            static:     '/manage/config/static',
            dynamic:    '/manage/config/dynamic',
        },

        // Account
        account: {
            profile:    '/manage/account/profile',
            email:      '/manage/account/email',
        },
    },

    // Plugins
    plugin:             '/plugin',
};

/**
 * The anonymous user, consistent with the predefined one in the database.
 */
export const AnonymousUser: User = {
    id:            '00000000-0000-0000-0000-000000000000',
    name:          $localize`Anonymous`,
    systemAccount: true,
    langId:        'en',
};

