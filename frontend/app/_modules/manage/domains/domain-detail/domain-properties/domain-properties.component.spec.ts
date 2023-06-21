import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider, MockService } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { ConfigService } from '../../../../../_services/config.service';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainDetailComponent } from '../domain-detail.component';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainPropertiesComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: ConfigService,   useValue: MockService(ConfigService)},
                {provide: ApiGeneralService, useValue: MockService(ApiGeneralService, {domainGet: () => of(null)} as any)},
                MockProvider(DomainDetailComponent, {domain: of(undefined), federatedIdpIds: of([])} as any),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
