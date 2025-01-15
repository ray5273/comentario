import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainImportComponent } from './domain-import.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';

describe('DomainImportComponent', () => {

    let component: DomainImportComponent;
    let fixture: ComponentFixture<DomainImportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    ReactiveFormsModule,
                    FontAwesomeTestingModule,
                    DomainImportComponent,
                    MockComponents(InfoIconComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainImportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
