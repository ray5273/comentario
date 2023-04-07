import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { DomainSettingsComponent } from './domain-settings.component';
import { ConfigService } from '../../../../../_services/config.service';
import { ApiOwnerService } from '../../../../../../generated-api';

describe('DomainSettingsComponent', () => {

    let component: DomainSettingsComponent;
    let fixture: ComponentFixture<DomainSettingsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainSettingsComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: ConfigService,   useValue: MockService(ConfigService)},
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService, {domainGet: () => of(null)} as any)},
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
