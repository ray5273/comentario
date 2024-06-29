import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { NavbarComponent } from './navbar.component';
import { DocsService } from '../_services/docs.service';
import { mockAuthService } from '../_utils/_mocks.spec';
import { ConfigService } from '../_services/config.service';

describe('NavbarComponent', () => {
    let component: NavbarComponent;
    let fixture: ComponentFixture<NavbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [NavbarComponent],
            imports: [RouterModule.forRoot([]), FontAwesomeTestingModule],
            providers: [
                mockAuthService(),
                MockProvider(DocsService),
                MockProvider(ConfigService, {pluginConfig: {plugins: []}}),
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
