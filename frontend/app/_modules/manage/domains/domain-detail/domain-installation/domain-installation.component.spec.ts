import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainInstallationComponent } from './domain-installation.component';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { ToolsModule } from '../../../../tools/tools.module';
import { ConfigService } from '../../../../../_services/config.service';
import { ClientConfig } from '../../../../../../generated-api';
import { DocsService } from '../../../../../_services/docs.service';

describe('DomainInstallationComponent', () => {

    let component: DomainInstallationComponent;
    let fixture: ComponentFixture<DomainInstallationComponent>;

    const clientConfig: ClientConfig = {
        baseUrl:       '',
        signupAllowed: false,
        idps:          [],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainInstallationComponent],
            imports: [FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ConfigService, useValue: MockService(ConfigService, {clientConfig})},
                {provide: DocsService,   useValue: MockService(DocsService)},
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainInstallationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
