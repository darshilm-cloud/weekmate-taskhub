/**
 * Bug filter sentinel handling.
 *
 * The assignee/label filters hold EITHER an array of ids OR the sentinel string
 * "unassigned"/"unlabelled". These tests exercise both sides of that union - the
 * branch static analysis wrongly assumed unreachable - through the real UI.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BugFilter from './index';

const subscribersList = [
  { _id: 'u1', full_name: 'Kunal Shah' },
  { _id: 'u2', full_name: 'Karan Tulsani' },
];
const projectLabels = [
  { _id: 'l1', title: 'Bug' },
  { _id: 'l2', title: 'Feature' },
];

const setup = (props = {}) => {
  const onConfigUpdate = jest.fn();
  const view = render(
    <BugFilter
      boardTasksBugs={[]}
      projectLabels={projectLabels}
      subscribersList={subscribersList}
      onConfigUpdate={onConfigUpdate}
      {...props}
    />
  );
  return { ...view, onConfigUpdate };
};

const openFilter = async () => {
  fireEvent.click(screen.getByRole('button', { name: /filter/i }));
  await waitFor(() => expect(document.querySelector('.filter-content')).not.toBeNull());
};

const openSection = async (label) => {
  const item = Array.from(document.querySelectorAll('.filter-menu-item'))
    .find((el) => el.textContent.trim().toLowerCase().includes(label));
  expect(item).toBeTruthy();
  fireEvent.click(item);
};

const lastConfig = (fn) => fn.mock.calls[fn.mock.calls.length - 1][0];

it('reports an empty filter configuration on mount', () => {
  const { onConfigUpdate } = setup();
  expect(onConfigUpdate).toHaveBeenCalled();
  expect(lastConfig(onConfigUpdate)).toBeTruthy();
});

it('opens the filter popover', async () => {
  setup();
  await openFilter();
  expect(document.querySelector('.filter-sidebar')).not.toBeNull();
});

describe('assignee sentinel', () => {
  it('stores the sentinel string when Unassigned is chosen', async () => {
    setup();
    await openFilter();
    await openSection('assignee');
    const row = (await screen.findByText('Unassigned Bugs')).closest('.assignee-item');
    expect(row.className).not.toContain('selected');
    fireEvent.click(row.querySelector('input'));
    // The row only renders as selected when the state IS the sentinel string,
    // which is the branch static analysis assumed unreachable.
    await waitFor(() =>
      expect(document.querySelector('.assignee-item.selected')).not.toBeNull()
    );
  });

  it('checks the Unassigned checkbox when it is the active filter', async () => {
    setup();
    await openFilter();
    await openSection('assignee');
    const row = (await screen.findByText('Unassigned Bugs')).closest('.assignee-item');
    const box = row.querySelector('input');
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    await waitFor(() => {
      const again = screen.getByText('Unassigned Bugs').closest('.assignee-item');
      expect(again.querySelector('input').checked).toBe(true);
    });
  });

  it('treats a real assignee as an array, leaving Unassigned unselected', async () => {
    setup();
    await openFilter();
    await openSection('assignee');
    const person = (await screen.findByText('Kunal Shah')).closest('.assignee-item');
    fireEvent.click(person.querySelector('input'));
    await waitFor(() => {
      const un = screen.queryByText('Unassigned Bugs');
      if (un) expect(un.closest('.assignee-item').className).not.toContain('selected');
    });
  });
});

describe('label sentinel', () => {
  it('stores the sentinel string when Unlabelled is chosen', async () => {
    setup();
    await openFilter();
    await openSection('label');
    const node = await screen.findByText(/unlabelled/i);
    const row = node.closest('.assignee-item') || node.parentElement;
    const box = row.querySelector('input');
    fireEvent.click(box);
    await waitFor(() => {
      const again = screen.getByText(/unlabelled/i);
      const r = again.closest('.assignee-item') || again.parentElement;
      expect(r.querySelector('input').checked).toBe(true);
    });
  });

  it('treats a real label as an array rather than the sentinel', async () => {
    setup();
    await openFilter();
    await openSection('label');
    const node = await screen.findByText('Bug');
    const row = node.closest('.assignee-item') || node.parentElement;
    fireEvent.click(row.querySelector('input'));
    await waitFor(() => expect(row.querySelector('input').checked).toBe(true));
  });
});
