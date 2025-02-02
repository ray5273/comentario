import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { mockConfigService, mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { AttributeTableComponent } from '../../attribute-table/attribute-table.component';
import { DomainRssLinkComponent } from '../domain-rss-link/domain-rss-link.component';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    DomainPropertiesComponent,
                    MockComponents(
                        DomainBadgeComponent,
                        NoDataComponent,
                        InfoIconComponent,
                        AttributeTableComponent,
                        DomainRssLinkComponent),
                ],
                providers: [
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
