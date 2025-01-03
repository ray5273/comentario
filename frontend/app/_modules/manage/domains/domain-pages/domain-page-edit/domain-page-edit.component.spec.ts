import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { DomainPageEditComponent } from './domain-page-edit.component';
import { ToolsModule } from '../../../../tools/tools.module';
import { ApiGeneralService } from '../../../../../../generated-api';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';
import { ToastService } from '../../../../../_services/toast.service';

describe('DomainPageEditComponent', () => {

    let component: DomainPageEditComponent;
    let fixture: ComponentFixture<DomainPageEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainPageEditComponent],
                imports: [RouterModule.forRoot([]), ReactiveFormsModule, ToolsModule],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(ToastService),
                    mockDomainSelector(),
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPageEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
