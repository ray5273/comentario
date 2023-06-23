import { CommentSortPipe } from './comment-sort.pipe';
import { CommentSort } from '../../../../generated-api';

describe('CommentSortPipe', () => {

    let pipe: CommentSortPipe;

    beforeEach(() => pipe = new CommentSortPipe());

    it('is created', () => {
        expect(pipe).toBeTruthy();
    });

    [
        {in: undefined,      want: ''},
        {in: null,           want: ''},
        {in: '',             want: ''},
        {in: 'whatever',     want: ''},
        {in: 'ta',           want: 'Oldest first'},
        {in: 'td',           want: 'Newest first'},
        {in: 'sa',           want: 'Least upvoted first'},
        {in: 'sd',           want: 'Most upvoted first'},
        {in: CommentSort.Ta, want: 'Oldest first'},
        {in: CommentSort.Td, want: 'Newest first'},
        {in: CommentSort.Sa, want: 'Least upvoted first'},
        {in: CommentSort.Sd, want: 'Most upvoted first'},
    ]
        .forEach(test =>
            it(`given '${test.in}', returns '${test.want}'`, () =>
                expect(pipe.transform(test.in)).toBe(test.want)));

});
