import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockComponents } from 'ng-mocks';
import { AppComponent } from './app.component';
import { ToastComponent } from '../toast/toast.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

describe('AppComponent', () => {

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    AppComponent, MockComponents(NavbarComponent, ToastComponent, FooterComponent),
                ],
            })
            .compileComponents();
    });

    it('creates the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('has \'Comentario\' as title', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app.title).toEqual('Comentario');
    });
});
