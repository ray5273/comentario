import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ServerMessageComponent } from './server-message.component';

describe('ServerMessageComponent', () => {
    let component: ServerMessageComponent;
    let fixture: ComponentFixture<ServerMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ServerMessageComponent],
            imports: [RouterModule.forRoot([])],
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
