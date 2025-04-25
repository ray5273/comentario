import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { UserPropertiesComponent } from './user-properties.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { ToastService } from '../../../../_services/toast.service';
import { mockConfigService } from '../../../../_utils/_mocks.spec';
import { AttributeTableComponent } from '../../attribute-table/attribute-table.component';
import { PrincipalService } from '../../../../_services/principal.service';

describe('UserPropertiesComponent', () => {

    let component: UserPropertiesComponent;
    let fixture: ComponentFixture<UserPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    UserPropertiesComponent,
                    MockComponents(NoDataComponent, AttributeTableComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(ToastService),
                    MockProvider(PrincipalService, {principal$: of(undefined)}),
                    mockConfigService(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(UserPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
