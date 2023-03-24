import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app/app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { ToastComponent } from './toast/toast.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { DocEmbedDirective } from './_directives/doc-embed.directive';
import { HttpInterceptorService } from './_services/http-interceptor.service';
import { BASE_PATH } from '../generated-api';
import { environment } from '../environments/environment';
import { ToolsModule } from './_modules/tools/tools.module';

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
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        NgbToastModule,
        AppRoutingModule,
        ToolsModule,
    ],
    providers: [
        // Base API path
        {provide: BASE_PATH, useValue: environment.apiBaseUrl},
        {provide: HTTP_INTERCEPTORS, useExisting: HttpInterceptorService, multi: true},
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
