import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider, MockService } from 'ng-mocks';
import { DomainSettingsComponent } from './domain-settings.component';
import { ConfigService } from '../../../../../_services/config.service';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainDetailComponent } from '../domain-detail.component';

describe('DomainSettingsComponent', () => {

    let component: DomainSettingsComponent;
    let fixture: ComponentFixture<DomainSettingsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainSettingsComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: ConfigService,   useValue: MockService(ConfigService)},
                {provide: ApiGeneralService, useValue: MockService(ApiGeneralService, {domainGet: () => of(null)} as any)},
                MockProvider(DomainDetailComponent, {domain: of(undefined), federatedIdpIds: of([])} as any),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainSettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
