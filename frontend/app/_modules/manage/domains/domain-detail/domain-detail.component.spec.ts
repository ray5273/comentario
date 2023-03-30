import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { DomainDetailComponent } from './domain-detail.component';
import { ApiOwnerService } from '../../../../../generated-api';
import { ConfigServiceMock, getApiOwnerServiceMock } from '../../../../_testing/mocks.spec';
import { ToolsModule } from '../../../tools/tools.module';
import { ConfigService } from '../../../../_services/config.service';

describe('DomainDetailComponent', () => {

    let component: DomainDetailComponent;
    let fixture: ComponentFixture<DomainDetailComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainDetailComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, NgbNavModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: getApiOwnerServiceMock()},
                {provide: ConfigService,   useValue: ConfigServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
