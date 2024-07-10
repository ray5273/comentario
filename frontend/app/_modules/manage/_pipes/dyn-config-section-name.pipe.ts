import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dynConfigSectionName',
})
export class DynConfigSectionNamePipe implements PipeTransform {

    private static NAMES: Record<string, string> = {
        'auth':         $localize`Authentication`,
        'comments':     $localize`Comments`,
        'integrations': $localize`Integrations`,
        'markdown':     $localize`Markdown`,
        'misc':         $localize`Miscellaneous`,
    };

    transform(key: string | null | undefined): string {
        return key ? (DynConfigSectionNamePipe.NAMES[key] || `[${key}]`) : '';
    }
}
