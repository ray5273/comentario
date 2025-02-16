/// <reference types="@angular/localize" />
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, LOCALE_ID, provideAppInitializer, Provider } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PlatformLocation } from '@angular/common';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { environment } from './environments/environment';
import { Configuration } from './generated-api';
import { httpErrorHandlerInterceptor } from './app/_services/http-error-handler.interceptor';
import { Utils } from './app/_utils/utils';
import { LANGUAGE, provideLanguage } from './environments/languages';
import { ConfigService } from './app/_services/config.service';
import { PluginService } from './app/_modules/plugin/_services/plugin.service';
import { provideRouting } from './app/provide-routing';
import { AppComponent } from './app/app/app.component';

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

bootstrapApplication(AppComponent, {
    providers: [
        provideRouting(),
        provideAnimations(),
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
        // ng2-charts
        provideCharts(withDefaultRegisterables()),
        // Initialise the services
        provideAppInitializer(() => inject(ConfigService).init()),
        provideAppInitializer(() => inject(PluginService).init()),
    ],
})
    .catch(err => console.error(err));
