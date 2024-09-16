import { languages } from './languages';

export const environment = {
    production:  true,
    apiBasePath: '/api', // Must be a relative or a schema-less URL for Angular's XSRF protection to work
    languages,
};
