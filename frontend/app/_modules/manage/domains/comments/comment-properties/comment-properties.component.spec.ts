import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentPropertiesComponent } from './comment-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';

describe('CommentPropertiesComponent', () => {

    let component: CommentPropertiesComponent;
    let fixture: ComponentFixture<CommentPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentPropertiesComponent, MockComponents(NoDataComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule, NgbModalModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: () => of(new DomainMeta())}),
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
