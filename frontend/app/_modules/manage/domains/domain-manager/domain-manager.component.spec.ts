import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiOwnerService } from '../../../../../generated-api';
import { getApiOwnerServiceMock } from '../../../../_testing/mocks.spec';

describe('DomainManagerComponent', () => {

    let component: DomainManagerComponent;
    let fixture: ComponentFixture<DomainManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainManagerComponent],
            providers: [
                {provide: ApiOwnerService, useValue: getApiOwnerServiceMock()},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
