import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { DomainPageMoveDataComponent } from './domain-page-move-data.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DialogService } from '../../../_services/dialog.service';

describe('DomainPageMoveDataComponent', () => {

    let component: DomainPageMoveDataComponent;
    let fixture: ComponentFixture<DomainPageMoveDataComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DomainPageMoveDataComponent, RouterModule.forRoot([])],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(DialogService),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPageMoveDataComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
