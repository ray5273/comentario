import { HashColourPipe } from './hash-colour.pipe';

describe('HashColourPipe', () => {

    let pipe: HashColourPipe;

    beforeEach(() => pipe = new HashColourPipe());

    it('is created', () => {
        expect(pipe).toBeTruthy();
    });

    [
        {in: undefined,                    want: '#c3c3c3'},
        {in: null,                         want: '#c3c3c3'},
        {in: false,                        want: '#c3c3c3'},
        {in: NaN,                          want: '#c3c3c3'},
        {in: '',                           want: '#c3c3c3'},
        {in: 0,                            want: '#ff6b6b'},
        {in: 1,                            want: '#fa5252'},
        {in: 59,                           want: '#d9480f'},
        {in: 60,                           want: '#ff6b6b'},
        {in: 2400,                         want: '#ff6b6b'},
        {in: 2399,                         want: '#d9480f'},
        {in: '1',                          want: '#5f3dc4'},
        {in: 'Lorem',                      want: '#40c057'},
        {in: 'Lorem ipsum dolor sit amet', want: '#ff6b6b'},
    ]
        .forEach(test => it(`given ${JSON.stringify(test.in)}, returns '${test.want}'`, () => {
            expect(pipe.transform(test.in)).toEqual(test.want);
        }));
});
