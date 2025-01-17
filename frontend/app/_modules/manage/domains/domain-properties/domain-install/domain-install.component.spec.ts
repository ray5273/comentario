import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { DomainInstallComponent } from './domain-install.component';
import { ConfigService } from '../../../../../_services/config.service';
import { InstanceStaticConfig } from '../../../../../../generated-api';
import { MockHighlightDirective, mockHighlightLoaderStub } from '../../../../../_utils/_mocks.spec';

describe('DomainInstallComponent', () => {

    let component: DomainInstallComponent;
    let fixture: ComponentFixture<DomainInstallComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    NgbCollapseModule,
                    FontAwesomeTestingModule,
                    DomainInstallComponent,
                    MockHighlightDirective,
                ],
                providers: [
                    MockProvider(ConfigService, {staticConfig: {baseUrl: '/'} as InstanceStaticConfig}),
                    mockHighlightLoaderStub(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainInstallComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
