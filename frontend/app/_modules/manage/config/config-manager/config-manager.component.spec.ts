import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfigManagerComponent } from './config-manager.component';

describe('ConfigManagerComponent', () => {

    let component: ConfigManagerComponent;
    let fixture: ComponentFixture<ConfigManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), NgbNavModule, ConfigManagerComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(ConfigManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
