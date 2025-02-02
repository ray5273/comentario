import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockDirectives } from 'ng-mocks';
import { HomeComponent } from './home.component';
import { DocEmbedDirective } from '../_directives/doc-embed.directive';
import { mockAuthService, mockConfigService } from '../_utils/_mocks.spec';

describe('HomeComponent', () => {

    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), HomeComponent, MockDirectives(DocEmbedDirective)],
                providers: [
                    mockConfigService(),
                    mockAuthService(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
