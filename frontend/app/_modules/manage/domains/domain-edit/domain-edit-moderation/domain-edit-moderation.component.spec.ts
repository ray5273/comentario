import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents } from 'ng-mocks';
import { DomainEditModerationComponent } from './domain-edit-moderation.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';

describe('DomainEditModerationComponent', () => {

    let component: DomainEditModerationComponent;
    let fixture: ComponentFixture<DomainEditModerationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    FontAwesomeTestingModule,
                    ReactiveFormsModule,
                    DomainEditModerationComponent,
                    MockComponents(InfoIconComponent)],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditModerationComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('formGroup', new FormGroup({
            anonymous:     new FormControl(false),
            authenticated: new FormControl(false),
            numCommentsOn: new FormControl(false),
            numComments:   new FormControl(0),
            userAgeDaysOn: new FormControl(false),
            userAgeDays:   new FormControl(0),
            links:         new FormControl(false),
            images:        new FormControl(false),
            notifyPolicy:  new FormControl(''),
        }));
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
