import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { MockProviders } from 'ng-mocks';
import { ToastComponent } from './toast.component';
import { AuthService } from '../_services/auth.service';
import { MockHighlightDirective, mockHighlightLoaderStub } from '../_utils/_mocks.spec';

describe('ToastComponent', () => {

    let component: ToastComponent;
    let fixture: ComponentFixture<ToastComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    NgbToastModule,
                    ToastComponent,
                    MockHighlightDirective,
                ],
                providers: [
                    MockProviders(AuthService),
                    mockHighlightLoaderStub(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(ToastComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
