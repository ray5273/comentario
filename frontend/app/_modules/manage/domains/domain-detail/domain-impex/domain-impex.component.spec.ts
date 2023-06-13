import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider, MockService } from 'ng-mocks';
import { DomainImpexComponent } from './domain-impex.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToastService } from '../../../../../_services/toast.service';
import { ToolsModule } from '../../../../tools/tools.module';
import { DomainDetailComponent } from '../domain-detail.component';

describe('DomainImpexComponent', () => {

    let component: DomainImpexComponent;
    let fixture: ComponentFixture<DomainImpexComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainImpexComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ApiGeneralService, useValue: MockService(ApiGeneralService)},
                {provide: ToastService,    useValue: MockService(ToastService)},
                MockProvider(DomainDetailComponent, {domain: of(undefined)} as any),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainImpexComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
