import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { FooterComponent } from './footer.component';
import { DocsService } from '../_services/docs.service';
import { ConfigService } from '../_services/config.service';
import { ComentarioConfig } from '../../generated-api';

describe('FooterComponent', () => {

    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FooterComponent],
            imports: [RouterTestingModule],
            providers: [
                MockProvider(DocsService),
                MockProvider(ConfigService, {config: {} as ComentarioConfig}),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
