import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { DomainPropsComponent } from './domain-props.component';
import { ConfigService } from '../../../../../_services/config.service';
import { ApiOwnerService } from '../../../../../../generated-api';

describe('DomainPropsComponent', () => {

    let component: DomainPropsComponent;
    let fixture: ComponentFixture<DomainPropsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainPropsComponent],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                {provide: ConfigService,   useValue: MockService(ConfigService)},
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService, {domainGet: () => of(null)} as any)},
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
