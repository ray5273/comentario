import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ServerMessageComponent } from './server-message.component';

describe('ServerMessageComponent', () => {
    let component: ServerMessageComponent;
    let fixture: ComponentFixture<ServerMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ServerMessageComponent],
            imports: [RouterTestingModule],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ServerMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
