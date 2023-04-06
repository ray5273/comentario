import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { DomainDangerZoneComponent } from './domain-danger-zone.component';
import { ApiOwnerService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';
import { ToastService } from '../../../../../_services/toast.service';

describe('DomainDangerZoneComponent', () => {

    let component: DomainDangerZoneComponent;
    let fixture: ComponentFixture<DomainDangerZoneComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainDangerZoneComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService)},
                {provide: ToastService,    useValue: MockService(ToastService)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainDangerZoneComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
