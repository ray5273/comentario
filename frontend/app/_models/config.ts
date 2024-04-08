import { DynamicConfigItem } from '../../generated-api';

/** Instance domain defaults key prefix. */
export const ConfigKeyDomainDefaultsPrefix = 'domain.defaults.';

/** Domain config item keys. */
export enum DomainConfigItemKey {
    commentDeletionAuthor    = 'comments.deletion.author',
    commentDeletionModerator = 'comments.deletion.moderator',
    commentEditingAuthor     = 'comments.editing.author',
    commentEditingModerator  = 'comments.editing.moderator',
    enableCommentVoting      = 'comments.enableVoting',
    showDeletedComments      = 'comments.showDeleted',
    markdownImagesEnabled    = 'markdown.images.enabled',
    markdownLinksEnabled     = 'markdown.links.enabled',
    markdownTablesEnabled    = 'markdown.tables.enabled',
    localSignupEnabled       = 'signup.enableLocal',
    federatedSignupEnabled   = 'signup.enableFederated',
    ssoSignupEnabled         = 'signup.enableSso',
}

/** Instance dynamic config item keys. */
export enum InstanceConfigItemKey {
    authLoginLocalMaxAttempts              = "auth.login.local.maxAttempts",
    authSignupConfirmCommenter             = 'auth.signup.confirm.commenter',
    authSignupConfirmUser                  = 'auth.signup.confirm.user',
    authSignupEnabled                      = 'auth.signup.enabled',
    integrationsUseGravatar                = 'integrations.useGravatar',
    operationNewOwnerEnabled               = 'operation.newOwner.enabled',
    // Domain defaults
    domainDefaultsCommentDeletionAuthor    = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.commentDeletionAuthor,
    domainDefaultsCommentDeletionModerator = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.commentDeletionModerator,
    domainDefaultsCommentEditingAuthor     = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.commentEditingAuthor,
    domainDefaultsCommentEditingModerator  = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.commentEditingModerator,
    domainDefaultsEnableCommentVoting      = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.enableCommentVoting,
    domainDefaultsShowDeletedComments      = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.showDeletedComments,
    domainDefaultsMarkdownImagesEnabled    = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.markdownImagesEnabled,
    domainDefaultsMarkdownLinksEnabled     = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.markdownLinksEnabled,
    domainDefaultsMarkdownTablesEnabled    = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.markdownTablesEnabled,
    domainDefaultsLocalSignupEnabled       = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.localSignupEnabled,
    domainDefaultsFederatedSignupEnabled   = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.federatedSignupEnabled,
    domainDefaultsSsoSignupEnabled         = ConfigKeyDomainDefaultsPrefix + DomainConfigItemKey.ssoSignupEnabled,
}

/**
 * Dynamic instance or domain configuration, which provides items either mapped by key or grouped by section, in a
 * predictable order.
 */
export class DynamicConfig {

    /** Configuration items, mapped by key. */
    readonly byKey: { [key: string]: DynamicConfigItem };

    /** Configuration items, grouped by section key. */
    readonly bySection: { [section: string]: DynamicConfigItem[] };

    constructor(
        configItems?: DynamicConfigItem[],
    ) {
        // Sort configuration items by section, then by item key
        configItems?.sort((a, b) => a.section?.localeCompare(b.section ?? '') || a.key.localeCompare(b.key));

        // Create configuration item maps
        this.byKey     = this.getConfigByKey(configItems);
        this.bySection = this.getConfigBySection(configItems);
    }

    /** All config items as a list. */
    get items(): DynamicConfigItem[] {
        return Object.values(this.byKey);
    }

    /**
     * Return a clone of this config.
     */
    clone(): DynamicConfig {
        return new DynamicConfig(this.items.map(item => JSON.parse(JSON.stringify(item))));
    }

    /**
     * Return a partial clone of this config that only contains domain default settings, removing the domain defaults
     * prefix from each key. This effectively translates instance config into a domain default config.
     */
    toDomainDefaults(): DynamicConfig {
        return new DynamicConfig(
            this.items
                .filter(item => item.key.startsWith(ConfigKeyDomainDefaultsPrefix))
                .map(item =>
                    JSON.parse(JSON.stringify({
                        ...item,
                        defaultValue: item.value,
                        key:          item.key.substring(ConfigKeyDomainDefaultsPrefix.length),
                    }))));
    }

    /**
     * Get config item by its key.
     */
    get(key: DomainConfigItemKey | InstanceConfigItemKey): DynamicConfigItem {
        return this.byKey?.[key];
    }

    /**
     * Get a boolean config item value by its key.
     */
    getBool(key: DomainConfigItemKey | InstanceConfigItemKey): boolean {
        return this.byKey?.[key]?.value === 'true';
    }

    /**
     * Return an object whose keys are configuration items' keys and values are the items.
     */
    private getConfigByKey(items?: DynamicConfigItem[]): typeof this.byKey {
        return items?.reduce(
            (acc, i) => {
                acc[i.key] = i;
                return acc;
            },
            {} as typeof this.byKey) || {};
    }

    /**
     * Return an object whose keys are configuration items' section keys and values are the item lists.
     */
    private getConfigBySection(items?: DynamicConfigItem[]): typeof this.bySection {
        return items?.reduce(
            (acc, i) => {
                const sec = i.section || '';
                if (sec in acc) {
                    acc[sec].push(i);
                } else {
                    acc[sec] = [i];
                }
                return acc;
            },
            {} as typeof this.bySection) || {};
    }
}
