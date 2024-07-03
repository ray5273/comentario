import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouteData } from '../_models/route-data';

@Component({
    selector: 'app-plugin-page',
    template: '',
})
export class PluginPageComponent implements OnInit {

    constructor(
        private readonly route: ActivatedRoute,
        private readonly element: ElementRef,
    ) {}

    ngOnInit(): void {
        this.insertComponent((this.route.snapshot.data as RouteData).plug.componentTag);
    }

    private insertComponent(tag: string): HTMLElement {
        const el = document.createElement(tag);
        (this.element.nativeElement as HTMLElement).appendChild(el);
        return el;
    }
}
