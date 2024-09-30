import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './_guards/auth.guard';

/**
 * Provide router and routing configuration
 */
export const provideRouting = () =>
    provideRouter(
        [
            // Auth
            {
                path:         'auth',
                loadChildren: () => import('./_modules/auth/auth.module').then(m => m.AuthModule),
            },

            // Control Center
            {
                path:         'manage',
                loadChildren: () => import('./_modules/manage/manage.module').then(m => m.ManageModule),
                canMatch:     [AuthGuard.isAuthenticatedMatch],
            },

            // Plugins, a sort of placeholder, to be replaced by the plugin service during its initialisation
            {path: 'plugin', children: []},

            // Fallback routes
            {path: '', pathMatch: 'full', component: HomeComponent},
            {path: '**', component: PageNotFoundComponent},
        ],
        withComponentInputBinding(),
        withInMemoryScrolling({scrollPositionRestoration: 'enabled'}));

