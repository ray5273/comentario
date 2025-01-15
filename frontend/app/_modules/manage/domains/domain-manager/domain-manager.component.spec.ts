import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainManagerComponent', () => {

    let component: DomainManagerComponent;
    let fixture: ComponentFixture<DomainManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    ReactiveFormsModule,
                    FontAwesomeTestingModule,
                    DomainManagerComponent,
                    MockComponents(SortSelectorComponent, SortPropertyComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService, {domainList: () => of({domains: []} as any)}),
                    mockDomainSelector(),
                    MockProvider(ConfigService),
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
