import { valueToLable } from './statusValueToLable';

it.each([
  ['in_progress', 'In Progress'],
  ['client_review', 'Client Review'],
  ['customer_lost', 'Customer Lost'],
  ['open', 'Open'],
  ['resolved', 'Resolved'],
  ['reopened', 'Reopened'],
])('maps %s to its display label', (v, label) => expect(valueToLable(v)).toBe(label));

it.each([undefined, null, '', 'unknown_status'])
  ('returns undefined for an unmapped value (%s)', (v) =>
    expect(valueToLable(v)).toBeUndefined());
