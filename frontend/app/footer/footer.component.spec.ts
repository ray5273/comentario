import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { FooterComponent } from './footer.component';
import { DocsService } from '../_services/docs.service';
import { ConfigService } from '../_services/config.service';
import { InstanceStaticConfig } from '../../generated-api';
import { mockAuthService } from '../_utils/_mocks.spec';
import { PluginService } from '../_modules/plugin/_services/plugin.service';

describe('FooterComponent', () => {

    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FooterComponent],
            imports: [RouterModule.forRoot([]), FontAwesomeTestingModule],
            providers: [
                MockProvider(DocsService),
                MockProvider(ConfigService, {staticConfig: {} as InstanceStaticConfig}),
                MockProvider(PluginService),
                mockAuthService(),
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
