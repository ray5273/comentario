import {ComponentFixture, TestBed} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import {UserPropertiesComponent} from './user-properties.component';
import { MockComponents, MockProvider } from 'ng-mocks';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { NoDataComponent } from '../../no-data/no-data.component';
import { ToastService } from '../../../../_services/toast.service';

describe('UserPropertiesComponent', () => {

    let component: UserPropertiesComponent;
    let fixture: ComponentFixture<UserPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserPropertiesComponent, MockComponents(NoDataComponent)],
            imports: [ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ToastService),
            ],
        });
        fixture = TestBed.createComponent(UserPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
