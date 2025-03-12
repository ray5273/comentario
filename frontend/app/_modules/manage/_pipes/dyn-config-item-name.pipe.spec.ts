import { DynConfigItemNamePipe } from './dyn-config-item-name.pipe';

describe('DynConfigItemNamePipe', () => {

    let pipe: DynConfigItemNamePipe;

    beforeEach(() => pipe = new DynConfigItemNamePipe());

    it('is created', () => {
        expect(pipe).toBeTruthy();
    });

    [
        {in: undefined,                                     want: ''},
        {in: null,                                          want: ''},
        {in: '',                                            want: ''},
        {in: 'foo',                                         want: '[foo]'},
        // Instance settings
        {in: 'auth.emailUpdate.enabled',                    want: 'Allow users to update their emails'},
        {in: 'auth.login.local.maxAttempts',                want: 'Max. failed login attempts'},
        {in: 'auth.signup.confirm.commenter',               want: 'New commenters must confirm their email'},
        {in: 'auth.signup.confirm.user',                    want: 'New users must confirm their email'},
        {in: 'auth.signup.enabled',                         want: 'Enable registration of new users'},
        {in: 'integrations.useGravatar',                    want: 'Use Gravatar for user avatars'},
        {in: 'operation.newOwner.enabled',                  want: 'Non-owner users can add domains'},
        // Domain defaults
        {in: 'domain.defaults.comments.deletion.author',    want: 'Allow comment authors to delete comments'},
        {in: 'domain.defaults.comments.deletion.moderator', want: 'Allow moderators to delete comments'},
        {in: 'domain.defaults.comments.editing.author',     want: 'Allow comment authors to edit comments'},
        {in: 'domain.defaults.comments.editing.moderator',  want: 'Allow moderators to edit comments'},
        {in: 'domain.defaults.comments.enableVoting',       want: 'Enable voting on comments'},
        {in: 'domain.defaults.comments.rss.enabled',        want: 'Enable comment RSS feeds'},
        {in: 'domain.defaults.comments.showDeleted',        want: 'Show deleted comments'},
        {in: 'domain.defaults.comments.text.maxLength',     want: 'Maximum comment text length'},
        {in: 'domain.defaults.markdown.images.enabled',     want: 'Enable images in comments'},
        {in: 'domain.defaults.markdown.links.enabled',      want: 'Enable links in comments'},
        {in: 'domain.defaults.markdown.tables.enabled',     want: 'Enable tables in comments'},
        {in: 'domain.defaults.login.showForUnauth',         want: 'Show login dialog for unauthenticated users'},
        {in: 'domain.defaults.signup.enableLocal',          want: 'Enable local commenter registration'},
        {in: 'domain.defaults.signup.enableFederated',      want: 'Enable commenter registration via external provider'},
        {in: 'domain.defaults.signup.enableSso',            want: 'Enable commenter registration via SSO'},
        // Domain settings
        {in: 'comments.deletion.author',                    want: 'Allow comment authors to delete comments'},
        {in: 'comments.deletion.moderator',                 want: 'Allow moderators to delete comments'},
        {in: 'comments.editing.author',                     want: 'Allow comment authors to edit comments'},
        {in: 'comments.editing.moderator',                  want: 'Allow moderators to edit comments'},
        {in: 'comments.enableVoting',                       want: 'Enable voting on comments'},
        {in: 'comments.rss.enabled',                        want: 'Enable comment RSS feeds'},
        {in: 'comments.showDeleted',                        want: 'Show deleted comments'},
        {in: 'comments.text.maxLength',                     want: 'Maximum comment text length'},
        {in: 'login.showForUnauth',                         want: 'Show login dialog for unauthenticated users'},
        {in: 'signup.enableLocal',                          want: 'Enable local commenter registration'},
        {in: 'signup.enableFederated',                      want: 'Enable commenter registration via external provider'},
        {in: 'signup.enableSso',                            want: 'Enable commenter registration via SSO'},
    ]
        .forEach(test =>
            it(`transforms '${test.in}' into '${test.want}'`, () =>
                expect(pipe.transform(test.in)).toEqual(test.want)));
});
