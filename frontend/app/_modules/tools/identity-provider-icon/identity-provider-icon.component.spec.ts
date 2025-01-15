import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { IdentityProviderIconComponent } from './identity-provider-icon.component';

describe('IdentityProviderIconComponent', () => {

    let component: IdentityProviderIconComponent;
    let fixture: ComponentFixture<IdentityProviderIconComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, IdentityProviderIconComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(IdentityProviderIconComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
