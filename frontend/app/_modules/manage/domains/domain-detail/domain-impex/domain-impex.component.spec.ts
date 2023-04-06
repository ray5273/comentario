import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { DomainImpexComponent } from './domain-impex.component';
import { ApiOwnerService } from '../../../../../../generated-api';
import { ToastService } from '../../../../../_services/toast.service';
import { ToolsModule } from '../../../../tools/tools.module';

describe('DomainImpexComponent', () => {

    let component: DomainImpexComponent;
    let fixture: ComponentFixture<DomainImpexComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainImpexComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService)},
                {provide: ToastService,    useValue: MockService(ToastService)},
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
