import { removeTitle } from './nameFilter';

it.each(['Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Mr', 'Mrs', 'Ms', 'Miss'])
  ('strips the leading title %s', (t) =>
    expect(removeTitle(`${t} Kunal Shah`)).toBe('Kunal Shah'));

it('leaves a name without a title untouched', () => {
  expect(removeTitle('Kunal Shah')).toBe('Kunal Shah');
});

it('only strips a title in the leading position', () => {
  expect(removeTitle('Kunal Mr. Shah')).toBe('Kunal Mr. Shah');
});

it('keeps middle names intact', () => {
  expect(removeTitle('Dr Kunal A Shah')).toBe('Dr Kunal A Shah'); // Dr is not in the list
  expect(removeTitle('Mr. Kunal A Shah')).toBe('Kunal A Shah');
});

it.each([undefined, null, ''])('passes falsy input straight through (%s)', (v) =>
  expect(removeTitle(v)).toBe(v));

it('handles a name that is only a title', () => {
  expect(removeTitle('Mr.')).toBe('');
});
