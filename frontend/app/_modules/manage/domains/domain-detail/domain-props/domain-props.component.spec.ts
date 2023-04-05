import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockService } from 'ng-mocks';
import { DomainPropsComponent } from './domain-props.component';
import { ConfigService } from '../../../../../_services/config.service';

describe('DomainPropsComponent', () => {

    let component: DomainPropsComponent;
    let fixture: ComponentFixture<DomainPropsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainPropsComponent],
            providers: [
                {provide: ConfigService, useValue: MockService(ConfigService)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPropsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
