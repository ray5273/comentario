import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfigManagerComponent } from './config-manager.component';

describe('ConfigManagerComponent', () => {

    let component: ConfigManagerComponent;
    let fixture: ComponentFixture<ConfigManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ConfigManagerComponent],
            imports: [RouterTestingModule, NgbNavModule],
        });
        fixture = TestBed.createComponent(ConfigManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
