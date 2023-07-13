import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { UserManagerComponent } from './user-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';

describe('UserManagerComponent', () => {

    let component: UserManagerComponent;
    let fixture: ComponentFixture<UserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [
                UserManagerComponent,
                MockComponents(DomainBadgeComponent, SortSelectorComponent, SortPropertyComponent, IdentityProviderIconComponent)],
            imports: [ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domain: of(undefined)}),
                MockProvider(ConfigService),
            ],
        });
        fixture = TestBed.createComponent(UserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
