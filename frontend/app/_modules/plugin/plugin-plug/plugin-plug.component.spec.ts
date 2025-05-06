import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { PluginPlugComponent } from './plugin-plug.component';
import { PluginService } from '../_services/plugin.service';

describe('PluginPlugComponent', () => {

    let component: PluginPlugComponent;
    let fixture: ComponentFixture<PluginPlugComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, PluginPlugComponent],
                providers: [
                    MockProvider(ActivatedRoute, {snapshot: {data: {plug: {componentTag: 'p'}}}} as any),
                    MockProvider(PluginService),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(PluginPlugComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
