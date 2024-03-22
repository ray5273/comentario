import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dynConfigItemName',
})
export class DynConfigItemNamePipe implements PipeTransform {

    private static ITEM_NAMES: { [k: string]: string } = {
        'auth.signup.confirm.commenter':               $localize`New commenters must confirm their email`,
        'auth.signup.confirm.user':                    $localize`New users must confirm their email`,
        'auth.signup.enabled':                         $localize`Enable registration of new users`,
        'domain.defaults.comments.deletion.author':    $localize`Allow comment authors to delete comments`,
        'domain.defaults.comments.deletion.moderator': $localize`Allow moderators to delete comments`,
        'domain.defaults.comments.editing.author':     $localize`Allow comment authors to edit comments`,
        'domain.defaults.comments.editing.moderator':  $localize`Allow moderators to edit comments`,
        'domain.defaults.comments.enableVoting':       $localize`Enable voting on comments`,
        'domain.defaults.comments.showDeleted':        $localize`Show deleted comments`,
        'domain.defaults.signup.enableLocal':          $localize`Enable local commenter registration`,
        'domain.defaults.signup.enableFederated':      $localize`Enable commenter registration via external provider`,
        'domain.defaults.signup.enableSso':            $localize`Enable commenter registration via SSO`,
        'domain.defaults.useGravatar':                 $localize`Use Gravatar for user avatars`,
        'markdown.images.enabled':                     $localize`Enable images in comments`,
        'markdown.links.enabled':                      $localize`Enable links in comments`,
        'markdown.tables.enabled':                     $localize`Enable tables in comments`,
        'operation.newOwner.enabled':                  $localize`Non-owner users can add domains`,
    };

    transform(key: string | null | undefined): string {
        if (!key) {
            return '';
        }

        // First, try the key as-is
        return DynConfigItemNamePipe.ITEM_NAMES[key] ??
            // Second, try to look up as a domain default
            DynConfigItemNamePipe.ITEM_NAMES[`domain.defaults.${key}`] ??
            // No luck, just return the key name in brackets
            `[${key}]`;
    }
}
