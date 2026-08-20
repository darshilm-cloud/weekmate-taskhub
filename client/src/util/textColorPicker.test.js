/**
 * Picks readable foreground text for an arbitrary background colour.
 * Getting this wrong makes labels unreadable, so both the hex and rgb paths
 * and the invalid-input fallback are covered.
 */
const textColorPicker = require('./textColorPicker');

describe('hex colours', () => {
  it.each([
    ['#ffffff', '#000000'], ['#FFFFFF', '#000000'], ['#f5f5f5', '#000000'],
  ])('returns black text on the light background %s', (bg, fg) =>
    expect(textColorPicker(bg)).toBe(fg));

  it.each([
    ['#000000', '#FFFFFF'], ['#0c182b', '#FFFFFF'], ['#185d87', '#FFFFFF'],
  ])('returns white text on the dark background %s', (bg, fg) =>
    expect(textColorPicker(bg)).toBe(fg));

  it('expands 3-digit shorthand hex', () => {
    expect(textColorPicker('#fff')).toBe('#000000');
    expect(textColorPicker('#000')).toBe('#FFFFFF');
  });

  it('treats #fff and #ffffff identically', () => {
    expect(textColorPicker('#fff')).toBe(textColorPicker('#ffffff'));
  });
});

describe('rgb colours', () => {
  it('reads an rgb() string', () => {
    expect(textColorPicker('rgb(255, 255, 255)')).toBe('#000000');
    expect(textColorPicker('rgb(0, 0, 0)')).toBe('#FFFFFF');
  });

  it('reads an rgba() string, ignoring alpha', () => {
    expect(textColorPicker('rgba(255, 255, 255, 0.5)')).toBe('#000000');
  });
});

describe('brightness threshold', () => {
  it('switches at the documented boundary', () => {
    // brightness = (r*299 + g*587 + b*114)/1000; > 155 -> black text
    expect(textColorPicker('rgb(155, 155, 155)')).toBe('#FFFFFF'); // exactly 155, not >
    expect(textColorPicker('rgb(156, 156, 156)')).toBe('#000000');
  });

  it('weights the channels by luma, so no single channel alone reads as light', () => {
    // green is weighted highest (0.587) but even full green is only 149.7,
    // still under the 155 threshold; blue (0.114) is far darker.
    expect(textColorPicker('rgb(0, 255, 0)')).toBe('#FFFFFF');
    expect(textColorPicker('rgb(0, 0, 255)')).toBe('#FFFFFF');
    // combined, they cross it
    expect(textColorPicker('rgb(0, 255, 255)')).toBe('#000000');
  });
});

describe('invalid input', () => {
  it.each(['#12345', 'notacolor', ''])
    ('falls back to black for %s', (bad) => expect(textColorPicker(bad)).toBe('#000000'));

  /**
   * KNOWN BUG, asserted deliberately.
   *
   * A hex string of the right LENGTH but with non-hex digits parses to NaN, and
   * the guard only checks `=== undefined`, not Number.isNaN. brightness becomes
   * NaN, `NaN > 155` is false, so it returns WHITE instead of the intended black
   * fallback - white text on an unknown background. Change this to '#000000'
   * when the guard is fixed to reject NaN.
   */
  it('returns white for a same-length non-hex string instead of the black fallback', () => {
    expect(textColorPicker('#xyzxyz')).toBe('#FFFFFF');
  });
});
