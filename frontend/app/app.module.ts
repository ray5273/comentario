import { APP_INITIALIZER, LOCALE_ID, NgModule, Provider } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { provideRouter, RouterModule, Routes, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { AppComponent } from './app/app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { ToastComponent } from './toast/toast.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { DocEmbedDirective } from './_directives/doc-embed.directive';
import { HttpInterceptorService } from './_services/http-interceptor.service';
import { ApiModule, Configuration } from '../generated-api';
import { environment } from '../environments/environment';
import { ToolsModule } from './_modules/tools/tools.module';
import { ConfigService } from './_services/config.service';
import { LANGUAGE, provideLanguage } from '../environments/languages';
import { AuthGuard } from './_guards/auth.guard';
import { PluginService } from './_services/plugin.service';
import { Utils } from './_utils/utils';

const routes: Routes = [
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

    // Plugins
    {
        path:         'plugin',
        loadChildren: () => import('./_modules/plugin/plugin.module').then(m => m.PluginModule),
    },

    // Fallback routes
    {path: '', pathMatch: 'full', component: HomeComponent},
    {path: '**',                  component: PageNotFoundComponent},
];

const provideApiConfig = (): Provider =>
    ({
        provide: Configuration,
        useFactory: (pl: PlatformLocation) => new Configuration({
            // Extract the base HREF from the current document, remove the language root (such as 'en/') from the base,
            // and append the API base path
            basePath: Utils.joinUrl(pl.getBaseHrefFromDOM().replace(/[\w-]+\/$/, ''), environment.apiBasePath),
        }),
        deps: [PlatformLocation],
    });

@NgModule({
    declarations: [
        AppComponent,
        DocEmbedDirective,
        FooterComponent,
        HomeComponent,
        NavbarComponent,
        PageNotFoundComponent,
        ToastComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        RouterModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        NgbToastModule,
        ApiModule,
        ToolsModule,
    ],
    providers: [
        // ngx-highlightjs
        provideHighlightOptions({
            coreLibraryLoader: () => import('highlight.js/lib/core'),
            languages: {
                html:     () => import('highlight.js/lib/languages/xml'),
                markdown: () => import('highlight.js/lib/languages/markdown'),
            }
        }),
        // API configuration
        provideApiConfig(),
        {provide: LANGUAGE, useFactory: provideLanguage, deps: [LOCALE_ID]},
        {provide: HTTP_INTERCEPTORS, useExisting: HttpInterceptorService, multi: true},
        provideRouter(
            routes,
            withComponentInputBinding(),
            withInMemoryScrolling({scrollPositionRestoration: 'enabled'})),
        // Initialise the services
        {provide: APP_INITIALIZER, useFactory: (cs: ConfigService) => () => cs.init(), deps: [ConfigService], multi: true},
        {provide: APP_INITIALIZER, useFactory: (ps: PluginService) => () => ps.init(), deps: [PluginService], multi: true},
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
