import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { PluginPageComponent } from './plugin-page.component';

describe('PluginPageComponent', () => {

    let component: PluginPageComponent;
    let fixture: ComponentFixture<PluginPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [PluginPageComponent],
                imports: [RouterModule.forRoot([])],
                providers: [
                    MockProvider(ActivatedRoute, {snapshot: {data: {plug: {componentTag: 'p'}}}} as any),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(PluginPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
