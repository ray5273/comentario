import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MockDirectives, MockProvider } from 'ng-mocks';
import { HomeComponent } from './home.component';
import { AuthService } from '../_services/auth.service';
import { DocEmbedDirective } from '../_directives/doc-embed.directive';
import { ConfigService } from '../_services/config.service';

describe('HomeComponent', () => {

    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HomeComponent, MockDirectives(DocEmbedDirective)],
            imports: [RouterTestingModule],
            providers: [
                MockProvider(AuthService, {principal: of(null)}),
                MockProvider(ConfigService, {staticConfig: {homeContentUrl: ''} as any}),
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
