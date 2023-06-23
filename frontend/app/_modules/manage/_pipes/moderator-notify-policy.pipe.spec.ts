import { ModeratorNotifyPolicyPipe } from './moderator-notify-policy.pipe';
import { DomainModNotifyPolicy } from '../../../../generated-api';

describe('ModeratorNotifyPolicyPipe', () => {

    let pipe: ModeratorNotifyPolicyPipe;

    beforeEach(() => pipe = new ModeratorNotifyPolicyPipe());

    it('is created', () => {
        expect(pipe).toBeTruthy();
    });

    [
        {in: undefined,                     want: ''},
        {in: null,                          want: ''},
        {in: '',                            want: ''},
        {in: 'whatever',                    want: ''},
        {in: 'none',                        want: 'Don\'t email'},
        {in: 'pending',                     want: 'For comments pending moderation'},
        {in: 'all',                         want: 'For all new comments'},
        {in: DomainModNotifyPolicy.None,    want: 'Don\'t email'},
        {in: DomainModNotifyPolicy.Pending, want: 'For comments pending moderation'},
        {in: DomainModNotifyPolicy.All,     want: 'For all new comments'},
    ]
        .forEach(test =>
            it(`given '${test.in}', returns '${test.want}'`, () =>
                expect(pipe.transform(test.in)).toBe(test.want)));
});
