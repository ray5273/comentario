import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { PageManagerComponent } from './page-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';

describe('PageManagerComponent', () => {

    let component: PageManagerComponent;
    let fixture: ComponentFixture<PageManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [PageManagerComponent, MockComponent(DomainBadgeComponent)],
        });
        fixture = TestBed.createComponent(PageManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
