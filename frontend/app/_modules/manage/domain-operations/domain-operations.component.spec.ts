import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { DomainOperationsComponent } from './domain-operations.component';
import { ApiGeneralService } from '../../../../generated-api';
import { ToastService } from '../../../_services/toast.service';
import { ToolsModule } from '../../tools/tools.module';

describe('DomainOperationsComponent', () => {

    let component: DomainOperationsComponent;
    let fixture: ComponentFixture<DomainOperationsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainOperationsComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ApiGeneralService, useValue: MockService(ApiGeneralService)},
                {provide: ToastService,      useValue: MockService(ToastService)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainOperationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
