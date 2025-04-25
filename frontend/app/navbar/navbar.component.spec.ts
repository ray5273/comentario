import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { NavbarComponent } from './navbar.component';
import { DocsService } from '../_services/docs.service';
import { PluginService } from '../_modules/plugin/_services/plugin.service';
import { PrincipalService } from '../_services/principal.service';

describe('NavbarComponent', () => {
    let component: NavbarComponent;
    let fixture: ComponentFixture<NavbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, NavbarComponent],
                providers: [
                    MockProvider(DocsService),
                    MockProvider(PluginService),
                    MockProvider(PrincipalService, {principal: signal(undefined)}),
                ],
            })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(NavbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
