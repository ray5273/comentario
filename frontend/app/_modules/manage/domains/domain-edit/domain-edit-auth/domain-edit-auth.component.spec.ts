import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents } from 'ng-mocks';
import { DomainEditAuthComponent } from './domain-edit-auth.component';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';

describe('DomainEditAuthComponent', () => {

    let component: DomainEditAuthComponent;
    let fixture: ComponentFixture<DomainEditAuthComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainEditAuthComponent, MockComponents(InfoBlockComponent, InfoIconComponent)],
                imports: [FontAwesomeTestingModule, ReactiveFormsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditAuthComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
