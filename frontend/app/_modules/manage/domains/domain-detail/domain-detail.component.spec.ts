import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { MockService } from 'ng-mocks';
import { DomainDetailComponent } from './domain-detail.component';
import { ApiOwnerService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';

describe('DomainDetailComponent', () => {

    let component: DomainDetailComponent;
    let fixture: ComponentFixture<DomainDetailComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainDetailComponent],
            imports: [RouterTestingModule, NgbNavModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService, {domainGet: () => of(null)} as any)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
