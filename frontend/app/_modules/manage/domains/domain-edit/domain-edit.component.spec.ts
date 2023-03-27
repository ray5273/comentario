import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainEditComponent } from './domain-edit.component';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiOwnerService } from '../../../../../generated-api';
import { ConfigServiceMock, getApiOwnerServiceMock } from '../../../../_testing/mocks.spec';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';

describe('DomainEditComponent', () => {

    let component: DomainEditComponent;
    let fixture: ComponentFixture<DomainEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainEditComponent],
            imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: getApiOwnerServiceMock()},
                {provide: ConfigService,   useValue: ConfigServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
