import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { InfoIconComponent } from './info-icon.component';
import { DocsService } from '../../../_services/docs.service';

describe('InfoIconComponent', () => {

    let component: InfoIconComponent;
    let fixture: ComponentFixture<InfoIconComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [NgbTooltipModule, FontAwesomeTestingModule, InfoIconComponent],
                providers: [
                    MockProvider(DocsService),
                ],
            })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(InfoIconComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
