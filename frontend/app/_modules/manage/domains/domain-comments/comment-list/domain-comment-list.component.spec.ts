import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainCommentListComponent } from './domain-comment-list.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { ToolsModule } from '../../../../tools/tools.module';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';

describe('DomainCommentListComponent', () => {

    let component: DomainCommentListComponent;
    let fixture: ComponentFixture<DomainCommentListComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainCommentListComponent, MockComponents(SortSelectorComponent, SortPropertyComponent)],
            imports: [ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ConfigService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ],
        });
        fixture = TestBed.createComponent(DomainCommentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
