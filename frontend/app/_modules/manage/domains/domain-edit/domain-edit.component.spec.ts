import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockService } from 'ng-mocks';
import { DomainEditComponent } from './domain-edit.component';
import { ApiOwnerService, ClientConfig } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';

describe('DomainEditComponent', () => {

    let component: DomainEditComponent;
    let fixture: ComponentFixture<DomainEditComponent>;

    const clientConfig: ClientConfig = {
        baseUrl:       '',
        signupAllowed: false,
        federatedIdps: [],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainEditComponent],
            imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, ToolsModule],
            providers: [
                {provide: ConfigService,  useValue: MockService(ConfigService, {clientConfig})},
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService, {domainGet: () => of(null)} as any)},
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
