import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockDirective } from 'ng-mocks';
import { AuthService } from '../../../_services/auth.service';
import { AuthServiceMock } from '../../../_testing/mocks.spec';
import { ControlCenterComponent } from './control-center.component';
import { ConfirmDirective } from '../../tools/_directives/confirm.directive';

describe('ControlCenterComponent', () => {

    let component: ControlCenterComponent;
    let fixture: ComponentFixture<ControlCenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ControlCenterComponent, MockDirective(ConfirmDirective)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(ControlCenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
