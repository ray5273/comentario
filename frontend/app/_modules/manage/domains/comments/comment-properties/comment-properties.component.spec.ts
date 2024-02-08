import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentPropertiesComponent } from './comment-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';
import { UserLinkComponent } from '../../../user-link/user-link.component';

describe('CommentPropertiesComponent', () => {

    let component: CommentPropertiesComponent;
    let fixture: ComponentFixture<CommentPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentPropertiesComponent, MockComponents(NoDataComponent, UserLinkComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule, NgbModalModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
            ],
        });
        fixture = TestBed.createComponent(CommentPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
