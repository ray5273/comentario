import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MockDirectives, MockProvider } from 'ng-mocks';
import { HomeComponent } from './home.component';
import { DocEmbedDirective } from '../_directives/doc-embed.directive';
import { mockConfigService } from '../_utils/_mocks.spec';
import { AuthService } from '../_services/auth.service';
import { PrincipalService } from '../_services/principal.service';

describe('HomeComponent', () => {

    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), HomeComponent, MockDirectives(DocEmbedDirective)],
                providers: [
                    mockConfigService(),
                    MockProvider(AuthService),
                    MockProvider(PrincipalService, {principal: signal(undefined)}),
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
