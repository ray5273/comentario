import { Sort, SortSpec } from './sort';

describe('Sort', () => {

    let sort: Sort;

    it('creates an instance', () => {
        sort = new Sort('XYZ', false);
        expect(sort).toBeTruthy();
        expect(sort.property).toBe('XYZ');
        expect(sort.descending).toBe(false);
    });

    describe('of', () => {

        [
            {spec: {} as SortSpec,                       prop: 'foo', desc: false, wantProp: 'foo', wantDesc: false},
            {spec: {property: 'bar'},                    prop: 'foo', desc: false, wantProp: 'bar', wantDesc: false},
            {spec: {property: 'baz'},                    prop: 'foo', desc: true,  wantProp: 'baz', wantDesc: true},
            {spec: {property: 'bax', descending: false}, prop: 'foo', desc: true,  wantProp: 'bax', wantDesc: false},
            {spec: {property: 'bux', descending: true},  prop: 'foo', desc: false, wantProp: 'bux', wantDesc: true},
        ].forEach(test => {
            it('creates instance from ' + JSON.stringify(test), () => {
                sort = Sort.of(test.spec, test.prop, test.desc);
                expect(sort.property).toBe(test.wantProp);
                expect(sort.descending).toBe(test.wantDesc);
            });
        });
    });

    describe('apply', () => {

        beforeEach(() => sort = new Sort('XYZ', false));

        it('toggles sort direction if called with the same property', () => {
            sort.apply('XYZ');
            expect(sort.property).toBe('XYZ');
            expect(sort.descending).toBe(true);
        });

        it('resets sort direction and property if called with the different property', () => {
            sort.apply('new');
            expect(sort.property).toBe('new');
            expect(sort.descending).toBe(false);
        });

        it('removes sort direction/property if called with null', () => {
            sort.apply(null);
            expect(sort.property).toBe('');
            expect(sort.descending).toBe(false);
        });

        it('removes sort direction/property if called with undefined', () => {
            sort.apply(undefined);
            expect(sort.property).toBe('');
            expect(sort.descending).toBe(false);
        });
    });
});
