import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { FooterComponent } from './footer.component';
import { DocsService } from '../_services/docs.service';
import { ConfigService } from '../_services/config.service';
import { InstanceStaticConfig } from '../../generated-api';
import { AuthService } from '../_services/auth.service';

describe('FooterComponent', () => {

    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FooterComponent],
            imports: [RouterTestingModule],
            providers: [
                MockProvider(DocsService),
                MockProvider(ConfigService, {staticConfig: {} as InstanceStaticConfig}),
                MockProvider(AuthService, {principal: of(null)}),
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
