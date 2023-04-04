import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainImportComponent } from './domain-import.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockService } from 'ng-mocks';
import { ToolsModule } from '../../../tools/tools.module';
import { ApiOwnerService } from '../../../../../generated-api';

describe('DomainImportComponent', () => {

    let component: DomainImportComponent;
    let fixture: ComponentFixture<DomainImportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainImportComponent],
            imports: [RouterTestingModule, ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainImportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
