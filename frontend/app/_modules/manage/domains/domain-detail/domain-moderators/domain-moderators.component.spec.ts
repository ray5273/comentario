import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockService } from 'ng-mocks';
import { DomainModeratorsComponent } from './domain-moderators.component';
import { ApiOwnerService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';

describe('DomainModeratorsComponent', () => {

    let component: DomainModeratorsComponent;
    let fixture: ComponentFixture<DomainModeratorsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainModeratorsComponent],
            imports: [ReactiveFormsModule, ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService)},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainModeratorsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
