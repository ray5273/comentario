import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockService } from 'ng-mocks';
import { DashboardComponent } from './dashboard.component';
import { ApiOwnerService } from '../../../../generated-api';
import { ToolsModule } from '../../tools/tools.module';

describe('DashboardComponent', () => {

    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DashboardComponent],
            imports: [ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService, {dashboardDataGet: () => of({}) as any})},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
