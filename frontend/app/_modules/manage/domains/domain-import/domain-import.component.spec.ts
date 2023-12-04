import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainImportComponent } from './domain-import.component';
import { ToolsModule } from '../../../tools/tools.module';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';

describe('DomainImportComponent', () => {

    let component: DomainImportComponent;
    let fixture: ComponentFixture<DomainImportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainImportComponent, MockComponents(InfoIconComponent)],
            imports: [RouterTestingModule, ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainImportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
