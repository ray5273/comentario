import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockDirective, MockProvider } from 'ng-mocks';
import { AuthService } from '../../../_services/auth.service';
import { ControlCenterComponent } from './control-center.component';
import { ConfirmDirective } from '../../tools/_directives/confirm.directive';
import { DomainSelectorService } from '../_services/domain-selector.service';

describe('ControlCenterComponent', () => {

    let component: ControlCenterComponent;
    let fixture: ComponentFixture<ControlCenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ControlCenterComponent, MockDirective(ConfirmDirective)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(AuthService, {principal: of(null)}),
                MockProvider(DomainSelectorService, {domainUserIdps: of({})}),
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
