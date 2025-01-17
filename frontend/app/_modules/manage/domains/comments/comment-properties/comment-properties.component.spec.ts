import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentPropertiesComponent } from './comment-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { mockDomainSelector, MockHighlightDirective, mockHighlightLoaderStub } from '../../../../../_utils/_mocks.spec';
import { UserLinkComponent } from '../../../user-link/user-link.component';

describe('CommentPropertiesComponent', () => {

    let component: CommentPropertiesComponent;
    let fixture: ComponentFixture<CommentPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    NgbModalModule,
                    CommentPropertiesComponent,
                    MockComponents(NoDataComponent, UserLinkComponent),
                    MockHighlightDirective,
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockDomainSelector(),
                    mockHighlightLoaderStub(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(CommentPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
