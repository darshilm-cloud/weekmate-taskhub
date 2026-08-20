/**
 * Timesheet "my logged time" CSV/HTML report builder.
 *
 * This is the file whose two map() callbacks returned nothing and whose result
 * was discarded - now forEach. These tests pin the emitted markup so that
 * change, and any future one, is visible.
 */
const { sheet1 } = require('../timesheetReportsCSVMyLoggedTimeDetails');

const entry = (over = {}) => ({
  createdBy: { full_name: 'Kunal Shah' },
  logged_date: '2026-08-19T00:00:00.000Z',
  projectDetails: { title: 'WeekMate TaskHub' },
  main_taskList: 'Sprint 12',
  task: 'Wire up SonarQube',
  descriptions: 'Set up the scanner and fix the lcov paths',
  bug: '-',
  time: '2h 30m',
  ...over,
});

describe('sheet1', () => {
  it('returns an html string wrapped in an object', () => {
    const out = sheet1({});
    expect(out).toHaveProperty('html');
    expect(typeof out.html).toBe('string');
  });

  it('emits the header row for an empty report', () => {
    const { html } = sheet1({});
    expect(html).toContain('<table id="table-to-xls">');
    expect(html).toContain('<th>Created By</th>');
    expect(html).toContain('<th>Time</th>');
    expect(html).toMatch(/<\/table>$/);
  });

  it('renders a date group heading and its entries', () => {
    const { html } = sheet1({
      '2026-08-19': { items: [entry()], totalTime: { hours: 2, minutes: 30 } },
    });
    expect(html).toContain('19 Aug 2026');
    expect(html).toContain('Kunal Shah');
    expect(html).toContain('WeekMate TaskHub');
    expect(html).toContain('Sprint 12');
    expect(html).toContain('2h 30m');
  });

  it('truncates the description to 23 characters', () => {
    const { html } = sheet1({
      '2026-08-19': { items: [entry({ descriptions: 'x'.repeat(50) })] },
    });
    expect(html).toContain('x'.repeat(23));
    expect(html).not.toContain('x'.repeat(24));
  });

  it('renders a Total row when totalTime is present', () => {
    const { html } = sheet1({
      '2026-08-19': { items: [entry()], totalTime: { hours: 7, minutes: 45 } },
    });
    expect(html).toContain('Total');
    expect(html).toContain('7h 45m');
  });

  it('omits the Total row when totalTime is absent', () => {
    const { html } = sheet1({ '2026-08-19': { items: [entry()] } });
    expect(html).not.toContain('>Total<');
  });

  it('falls back to a dash for missing entry fields', () => {
    const { html } = sheet1({
      '2026-08-19': {
        items: [{ descriptions: '', logged_date: '2026-08-19T00:00:00.000Z' }],
      },
    });
    expect(html).toContain(' - ');
  });

  it('skips a date group that has no items', () => {
    const { html } = sheet1({ '2026-08-19': { totalTime: { hours: 1, minutes: 0 } } });
    expect(html).toContain('<table');
    expect(html).not.toContain('Kunal Shah');
  });

  it('renders several date groups', () => {
    const { html } = sheet1({
      '2026-08-18': { items: [entry({ task: 'First task' })] },
      '2026-08-19': { items: [entry({ task: 'Second task' })] },
    });
    expect(html).toContain('First task');
    expect(html).toContain('Second task');
    expect(html).toContain('18 Aug 2026');
    expect(html).toContain('19 Aug 2026');
  });

  it('renders the grandTotal block separately from the date groups', () => {
    const { html } = sheet1({
      '2026-08-19': { items: [entry()] },
      grandTotal: { hours: 40, minutes: 15 },
    });
    expect(html).toContain('<table');
    expect(html).toContain('Kunal Shah');
  });

  it('swallows a malformed payload rather than throwing', () => {
    // The builder wraps everything in try/catch and returns undefined on error.
    expect(() => sheet1(null)).not.toThrow();
    expect(() => sheet1({ '2026-08-19': { items: [{}] } })).not.toThrow();
  });
});
