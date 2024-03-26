import { DynConfigSectionNamePipe } from './dyn-config-section-name.pipe';

describe('DynConfigSectionNamePipe', () => {

    let pipe: DynConfigSectionNamePipe;

    beforeEach(() => pipe = new DynConfigSectionNamePipe());

    it('is created', () => {
        expect(pipe).toBeTruthy();
    });

    [
        {in: undefined,      want: ''},
        {in: null,           want: ''},
        {in: '',             want: ''},
        {in: 'foo',          want: '[foo]'},
        {in: 'auth',         want: 'Authentication'},
        {in: 'comments',     want: 'Comments'},
        {in: 'integrations', want: 'Integrations'},
        {in: 'markdown',     want: 'Markdown'},
        {in: 'misc',         want: 'Miscellaneous'},
    ]
        .forEach(test =>
            it(`transforms '${test.in}' into '${test.want}'`, () =>
                expect(pipe.transform(test.in)).toEqual(test.want)));
});
