import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginPlugComponent } from './plugin-plug/plugin-plug.component';

@NgModule({
    declarations: [
        PluginPlugComponent,
    ],
    imports: [
        CommonModule,
    ],
    exports: [
        PluginPlugComponent,
    ],
})
export class PluginModule {}
