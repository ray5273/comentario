import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentListComponent } from './comment-list.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { ToolsModule } from '../../../tools/tools.module';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';

describe('CommentListComponent', () => {

    let component: CommentListComponent;
    let fixture: ComponentFixture<CommentListComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentListComponent, MockComponents(SortSelectorComponent, SortPropertyComponent)],
            imports: [ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ConfigService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ],
        });
        fixture = TestBed.createComponent(CommentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
