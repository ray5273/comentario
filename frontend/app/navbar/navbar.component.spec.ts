import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NavbarComponent } from './navbar.component';
import { AuthServiceMock } from '../_testing/mocks.spec';
import { AuthService } from '../_services/auth.service';

describe('NavbarComponent', () => {
    let component: NavbarComponent;
    let fixture: ComponentFixture<NavbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [NavbarComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
            ],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(NavbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
