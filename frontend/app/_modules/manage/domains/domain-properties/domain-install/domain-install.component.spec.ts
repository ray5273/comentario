import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { DomainInstallComponent } from './domain-install.component';
import { mockConfigService, MockHighlightDirective, mockHighlightLoaderStub } from '../../../../../_utils/_mocks.spec';

describe('DomainInstallComponent', () => {

    let component: DomainInstallComponent;
    let fixture: ComponentFixture<DomainInstallComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    NgbCollapseModule,
                    FontAwesomeTestingModule,
                    DomainInstallComponent,
                    MockHighlightDirective,
                ],
                providers: [
                    mockHighlightLoaderStub(),
                    mockConfigService(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainInstallComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
