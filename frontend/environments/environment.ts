import { languages } from './languages';

export const environment = {
    production:  false,
    apiBasePath: '/api', // Must be a relative or a schema-less URL for Angular's XSRF protection to work
    languages,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error';
