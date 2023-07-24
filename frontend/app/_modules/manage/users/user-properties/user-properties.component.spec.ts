import {ComponentFixture, TestBed} from '@angular/core/testing';
import {UserPropertiesComponent} from './user-properties.component';
import { MockProvider } from 'ng-mocks';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';

describe('UserPropertiesComponent', () => {

    let component: UserPropertiesComponent;
    let fixture: ComponentFixture<UserPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserPropertiesComponent],
            imports: [ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
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
