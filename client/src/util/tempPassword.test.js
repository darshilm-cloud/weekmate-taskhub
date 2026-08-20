import { generateTempPassword } from './tempPassword';

it('is prefixed so the recipient can see it is temporary', () => {
  expect(generateTempPassword()).toMatch(/^Temp@/);
});

it('produces the requested seed length', () => {
  expect(generateTempPassword(6)).toHaveLength('Temp@'.length + 6);
  expect(generateTempPassword(12)).toHaveLength('Temp@'.length + 12);
});

it('defaults to a six character seed', () => {
  expect(generateTempPassword()).toHaveLength('Temp@'.length + 6);
});

it('uses only alphanumerics in the seed', () => {
  expect(generateTempPassword(64).replace('Temp@', '')).toMatch(/^[a-zA-Z0-9]+$/);
});

it('does not repeat across calls', () => {
  const seen = new Set(Array.from({ length: 25 }, () => generateTempPassword(16)));
  expect(seen.size).toBe(25);
});

it('draws from the CSPRNG, not Math.random', () => {
  const spy = jest.spyOn(window.crypto, 'getRandomValues');
  const mathSpy = jest.spyOn(Math, 'random');
  generateTempPassword();
  expect(spy).toHaveBeenCalled();
  expect(mathSpy).not.toHaveBeenCalled();
  spy.mockRestore();
  mathSpy.mockRestore();
});

it('spans a wide alphabet rather than a stuck value', () => {
  const chars = new Set(generateTempPassword(500).replace('Temp@', '').split(''));
  expect(chars.size).toBeGreaterThan(30);
});
