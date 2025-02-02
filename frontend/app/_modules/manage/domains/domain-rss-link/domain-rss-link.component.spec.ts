import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DomainRssLinkComponent } from './domain-rss-link.component';
import { mockConfigService, mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainRssLinkComponent', () => {

    let component: DomainRssLinkComponent;
    let fixture: ComponentFixture<DomainRssLinkComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    DomainRssLinkComponent,
                ],
                providers: [
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainRssLinkComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
