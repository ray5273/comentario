import { APP_INITIALIZER, LOCALE_ID, NgModule, Provider } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { Highlight, provideHighlightOptions } from 'ngx-highlightjs';
import { AppComponent } from './app/app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { ToastComponent } from './toast/toast.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { DocEmbedDirective } from './_directives/doc-embed.directive';
import { httpErrorHandlerInterceptor } from './_services/http-error-handler.interceptor';
import { ApiModule, Configuration } from '../generated-api';
import { environment } from '../environments/environment';
import { ToolsModule } from './_modules/tools/tools.module';
import { ConfigService } from './_services/config.service';
import { LANGUAGE, provideLanguage } from '../environments/languages';
import { Utils } from './_utils/utils';
import { provideRouting } from './provide-routing';
import { PluginService } from './_modules/plugin/_services/plugin.service';
import { PluginModule } from './_modules/plugin/plugin.module';

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
        FormsModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        NgbToastModule,
        ApiModule,
        ToolsModule,
        PluginModule,
        Highlight,
    ],
    providers: [
        // HTTP client
        provideHttpClient(withInterceptors([httpErrorHandlerInterceptor])),
        // ngx-highlightjs
        provideHighlightOptions({
            coreLibraryLoader: () => import('highlight.js/lib/core'),
            languages: {
                html:     () => import('highlight.js/lib/languages/xml'),
                json:     () => import('highlight.js/lib/languages/json'),
                markdown: () => import('highlight.js/lib/languages/markdown'),
            },
        }),
        // API configuration
        provideApiConfig(),
        {provide: LANGUAGE, useFactory: provideLanguage, deps: [LOCALE_ID]},
        // Initialise the services
        {
            provide: APP_INITIALIZER,
            useFactory: (cs: ConfigService) => () => cs.init(),
            deps: [ConfigService],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            useFactory: (ps: PluginService) => () => ps.init(),
            deps: [PluginService],
            multi: true,
        },
        provideRouting(),
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
