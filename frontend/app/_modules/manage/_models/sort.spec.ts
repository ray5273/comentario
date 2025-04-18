import { Sort } from './sort';

describe('Sort', () => {

    let sort: Sort;
    let emitted: boolean;

    beforeEach(() => emitted = false);

    it('creates an instance with defaults', () => {
        sort = new Sort(['ABC', 'XYZ'], 'XYZ', false);
        sort.changes.subscribe(() => emitted = true);
        expect(sort).toBeTruthy();
        expect(sort.property).toBe('XYZ');
        expect(sort.descending).toBeFalse();
        expect(emitted).toBeFalse();
    });

    describe('asString', () => {

        [
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: '',     wantProp: 'bar', wantDesc: false, wantStr: 'bar',  emits: false},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: '',     wantProp: 'bar', wantDesc: true,  wantStr: '-bar', emits: false},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: 'bar',  wantProp: 'bar', wantDesc: false, wantStr: 'bar',  emits: false},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: 'bar',  wantProp: 'bar', wantDesc: false, wantStr: 'bar',  emits: true},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: '-bar', wantProp: 'bar', wantDesc: true,  wantStr: '-bar', emits: true},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: '-bar', wantProp: 'bar', wantDesc: true,  wantStr: '-bar', emits: false},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: 'foo',  wantProp: 'foo', wantDesc: false, wantStr: 'foo',  emits: true},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: 'foo',  wantProp: 'foo', wantDesc: false, wantStr: 'foo',  emits: true},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: '-foo', wantProp: 'foo', wantDesc: true,  wantStr: '-foo', emits: true},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: '-foo', wantProp: 'foo', wantDesc: true,  wantStr: '-foo', emits: true},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: 'zzz',  wantProp: 'bar', wantDesc: false, wantStr: 'bar',  emits: false},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: 'zzz',  wantProp: 'bar', wantDesc: true,  wantStr: '-bar', emits: false},
            {defProp: 'bar', defDesc: false, wantInit: 'bar',  setTo: '-zzz', wantProp: 'bar', wantDesc: false, wantStr: 'bar',  emits: false},
            {defProp: 'bar', defDesc: true,  wantInit: '-bar', setTo: '-zzz', wantProp: 'bar', wantDesc: true,  wantStr: '-bar', emits: false},
        ]
            .forEach(test =>
                it('serialise/deserialises from ' + JSON.stringify(test), () => {
                    // Create a Sort
                    sort = new Sort(['foo', 'bar'], test.defProp, test.defDesc);
                    sort.changes.subscribe(() => emitted = true);

                    // Verify initial serialised value
                    expect(sort.asString).toBe(test.wantInit);
                    expect(emitted).toBeFalse();

                    // Set the new value
                    sort.asString = test.setTo;

                    // Verify the values again
                    expect(sort.property).toBe(test.wantProp);
                    expect(sort.descending).toBe(test.wantDesc);
                    expect(sort.asString).toBe(test.wantStr);
                    expect(emitted).toBe(test.emits);
                }));
    });

    describe('apply', () => {

        beforeEach(() => {
            sort = new Sort(['ABC', 'XYZ'], 'XYZ', false);
            sort.changes.subscribe(() => emitted = true);
        });

        it('toggles sort direction if called with the same property', () => {
            sort.apply('XYZ');
            expect(sort.property).toBe('XYZ');
            expect(sort.descending).toBeTrue();
            expect(emitted).toBeTrue();
        });

        it('resets sort direction and property if called with the different property', () => {
            sort.apply('ABC');
            expect(sort.property).toBe('ABC');
            expect(sort.descending).toBeFalse();
            expect(emitted).toBeTrue();
        });

        it('keeps default sort if called with null', () => {
            sort.apply(null);
            expect(sort.property).toBe('XYZ');
            expect(sort.descending).toBeFalse();
            expect(emitted).toBeFalse();
        });

        it('keeps default sort if called with undefined', () => {
            sort.apply(undefined);
            expect(sort.property).toBe('XYZ');
            expect(sort.descending).toBeFalse();
            expect(emitted).toBeFalse();
        });
    });
});
