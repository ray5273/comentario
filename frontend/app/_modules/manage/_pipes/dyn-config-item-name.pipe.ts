import { Pipe, PipeTransform } from '@angular/core';
import { ConfigKeyDomainDefaultsPrefix, InstanceConfigItemKey } from '../../../_models/config';

@Pipe({
    name: 'dynConfigItemName',
})
export class DynConfigItemNamePipe implements PipeTransform {

    private static ITEM_NAMES: { [k in InstanceConfigItemKey]: string } = {
        [InstanceConfigItemKey.authLoginLocalMaxAttempts]:              $localize`Max. failed login attempts`,
        [InstanceConfigItemKey.authSignupConfirmCommenter]:             $localize`New commenters must confirm their email`,
        [InstanceConfigItemKey.authSignupConfirmUser]:                  $localize`New users must confirm their email`,
        [InstanceConfigItemKey.authSignupEnabled]:                      $localize`Enable registration of new users`,
        [InstanceConfigItemKey.integrationsUseGravatar]:                $localize`Use Gravatar for user avatars`,
        [InstanceConfigItemKey.operationNewOwnerEnabled]:               $localize`Non-owner users can add domains`,
        // Domain defaults
        [InstanceConfigItemKey.domainDefaultsCommentDeletionAuthor]:    $localize`Allow comment authors to delete comments`,
        [InstanceConfigItemKey.domainDefaultsCommentDeletionModerator]: $localize`Allow moderators to delete comments`,
        [InstanceConfigItemKey.domainDefaultsCommentEditingAuthor]:     $localize`Allow comment authors to edit comments`,
        [InstanceConfigItemKey.domainDefaultsCommentEditingModerator]:  $localize`Allow moderators to edit comments`,
        [InstanceConfigItemKey.domainDefaultsEnableCommentVoting]:      $localize`Enable voting on comments`,
        [InstanceConfigItemKey.domainDefaultsShowDeletedComments]:      $localize`Show deleted comments`,
        [InstanceConfigItemKey.domainDefaultsMarkdownImagesEnabled]:    $localize`Enable images in comments`,
        [InstanceConfigItemKey.domainDefaultsMarkdownLinksEnabled]:     $localize`Enable links in comments`,
        [InstanceConfigItemKey.domainDefaultsMarkdownTablesEnabled]:    $localize`Enable tables in comments`,
        [InstanceConfigItemKey.domainDefaultsLocalSignupEnabled]:       $localize`Enable local commenter registration`,
        [InstanceConfigItemKey.domainDefaultsFederatedSignupEnabled]:   $localize`Enable commenter registration via external provider`,
        [InstanceConfigItemKey.domainDefaultsSsoSignupEnabled]:         $localize`Enable commenter registration via SSO`,
    };

    transform(key: string | null | undefined): string {
        if (!key) {
            return '';
        }

        // First, try the key as-is
        return DynConfigItemNamePipe.ITEM_NAMES[key as InstanceConfigItemKey] ??
            // Second, try to look up as a domain default
            DynConfigItemNamePipe.ITEM_NAMES[(ConfigKeyDomainDefaultsPrefix + key) as InstanceConfigItemKey] ??
            // No luck, just return the key name in brackets
            `[${key}]`;
    }
}
