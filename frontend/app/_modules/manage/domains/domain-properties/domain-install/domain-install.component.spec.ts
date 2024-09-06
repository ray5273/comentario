import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { Highlight } from 'ngx-highlightjs';
import { MockProvider } from 'ng-mocks';
import { DomainInstallComponent } from './domain-install.component';
import { ConfigService } from '../../../../../_services/config.service';
import { InstanceStaticConfig } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';

describe('DomainInstallComponent', () => {

    let component: DomainInstallComponent;
    let fixture: ComponentFixture<DomainInstallComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainInstallComponent],
            imports: [ReactiveFormsModule, NgbCollapseModule, FontAwesomeTestingModule, Highlight, ToolsModule],
            providers: [
                MockProvider(ConfigService, {staticConfig: {baseUrl: '/'} as InstanceStaticConfig}),
            ],
        });
        fixture = TestBed.createComponent(DomainInstallComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
