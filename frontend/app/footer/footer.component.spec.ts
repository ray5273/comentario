import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { FooterComponent } from './footer.component';
import { DocsService } from '../_services/docs.service';
import { mockConfigService } from '../_utils/_mocks.spec';
import { PluginService } from '../_modules/plugin/_services/plugin.service';
import { PrincipalService } from '../_services/principal.service';

describe('FooterComponent', () => {

    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, FooterComponent],
                providers: [
                    MockProvider(DocsService),
                    MockProvider(PluginService),
                    MockProvider(PrincipalService, {principal: signal(undefined)}),
                    mockConfigService(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
