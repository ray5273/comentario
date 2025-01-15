import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPagePropertiesComponent } from './domain-page-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainPagePropertiesComponent', () => {

    let component: DomainPagePropertiesComponent;
    let fixture: ComponentFixture<DomainPagePropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    DomainPagePropertiesComponent,
                    MockComponents(NoDataComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainPagePropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
