import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { DomainSelectorService } from '../../_services/domain-selector.service';

describe('DomainManagerComponent', () => {

    let component: DomainManagerComponent;
    let fixture: ComponentFixture<DomainManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainManagerComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService, {domainList: () => of({domains: []} as any)}),
                MockProvider(DomainSelectorService, {domain: of(undefined)}),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
