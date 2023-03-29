import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { SignupComponent } from './signup.component';
import { ConfigServiceMock, getApiAuthServiceMock } from '../../../_testing/mocks.spec';
import { ConfigService } from '../../../_services/config.service';
import { ApiAuthService } from '../../../../generated-api';

describe('SignupComponent', () => {

    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SignupComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: ApiAuthService, useValue: getApiAuthServiceMock()},
                {provide: ConfigService,  useValue: ConfigServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(SignupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
