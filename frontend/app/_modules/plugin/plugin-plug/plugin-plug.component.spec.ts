import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { PluginPlugComponent } from './plugin-plug.component';
import { PluginService } from '../_services/plugin.service';
import { ToolsModule } from '../../tools/tools.module';

describe('PluginPlugComponent', () => {

    let component: PluginPlugComponent;
    let fixture: ComponentFixture<PluginPlugComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [PluginPlugComponent],
                imports: [RouterModule.forRoot([]), ToolsModule],
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
