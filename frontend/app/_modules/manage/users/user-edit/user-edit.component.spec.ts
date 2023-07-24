import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { UserEditComponent } from './user-edit.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';

describe('UserEditComponent', () => {

    let component: UserEditComponent;
    let fixture: ComponentFixture<UserEditComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserEditComponent],
            imports: [ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
            ],
        });
        fixture = TestBed.createComponent(UserEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
