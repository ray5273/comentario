import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentListComponent } from './comment-list.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { mockConfigService, mockDomainSelector, mockLocalSettingService } from '../../../../../_utils/_mocks.spec';
import { UserLinkComponent } from '../../../user-link/user-link.component';

describe('CommentListComponent', () => {

    let component: CommentListComponent;
    let fixture: ComponentFixture<CommentListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    FontAwesomeTestingModule,
                    CommentListComponent,
                    MockComponents(SortSelectorComponent, SortPropertyComponent, UserLinkComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockLocalSettingService(),
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(CommentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
