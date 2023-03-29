import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastComponent } from './toast.component';
import { AuthService } from '../_services/auth.service';
import { AuthServiceMock } from '../_testing/mocks.spec';
import { ToolsModule } from '../_modules/tools/tools.module';

describe('ToastComponent', () => {

    let component: ToastComponent;
    let fixture: ComponentFixture<ToastComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ToastComponent],
            imports: [RouterTestingModule, NgbToastModule, ToolsModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
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
