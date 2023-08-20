import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockDirectives, MockProvider } from 'ng-mocks';
import { HomeComponent } from './home.component';
import { DocsService } from '../_services/docs.service';
import { AuthService } from '../_services/auth.service';
import { DocEmbedDirective } from '../_directives/doc-embed.directive';
import { ConfigService } from '../_services/config.service';

describe('HomeComponent', () => {

    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HomeComponent, MockDirectives(DocEmbedDirective)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(AuthService, {principal: of(null)}),
                MockProvider(ConfigService, {config: {homeContentUrl: ''} as any}),
                MockProvider(DocsService),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
