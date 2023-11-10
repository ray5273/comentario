import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { DomainImportComponent } from './domain-import.component';
import { ToolsModule } from '../../../tools/tools.module';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';

describe('DomainImportComponent', () => {

    let component: DomainImportComponent;
    let fixture: ComponentFixture<DomainImportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainImportComponent],
            imports: [RouterTestingModule, ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: () => of(new DomainMeta())}),
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
