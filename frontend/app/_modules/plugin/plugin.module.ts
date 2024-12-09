import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginPlugComponent } from './plugin-plug/plugin-plug.component';
import { ToolsModule } from '../tools/tools.module';

@NgModule({
    declarations: [
        PluginPlugComponent,
    ],
    imports: [
        CommonModule,
        ToolsModule,
    ],
    exports: [
        PluginPlugComponent,
    ],
})
export class PluginModule {}
