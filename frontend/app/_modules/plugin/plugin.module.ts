import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule, Routes, ROUTES } from '@angular/router';
import { ConfigService } from '../../_services/config.service';
import { PluginPageComponent } from './plugin-page/plugin-page.component';
import { PluginConfig, PluginUIPlugConfig } from '../../../generated-api';
import { RouteData } from './_models/route-data';

/** Return a route spec for the given plugin and UI plug. */
const plugRoute = (plugin: PluginConfig, plug: PluginUIPlugConfig): Route => {
    return {
        path:      `${plugin.path}/${plug.path}`,
        component: PluginPageComponent,
        data:      {plugin, plug} as RouteData,
    };
};

/** Make a list of child routes for  UI plug of each plugin. */
const routes = (configSvc: ConfigService): Routes => configSvc.pluginConfig.plugins
    ?.flatMap(plugin => plugin.uiPlugs?.map(plug => plugRoute(plugin, plug)) ?? []) ?? [];

@NgModule({
    declarations: [
        PluginPageComponent,
    ],
    providers: [
        {provide: ROUTES, useFactory: routes, deps: [ConfigService], multi: true},
    ],
    imports: [
        CommonModule,
        RouterModule.forChild([]),
    ],
    exports: [
        RouterModule,
    ]
})

export class PluginModule {}
