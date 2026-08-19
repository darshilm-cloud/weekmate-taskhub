/**
 * SortByComponent renders its sort options eagerly.
 *
 * Covers renderFilterContent, which used to be a switch whose every arm returned
 * the same content. The popover body is built during render, so mounting the
 * component is enough to exercise it.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SortByComponent from './SortByComponent';

const setup = (props = {}) => {
  const handleSortFilter = jest.fn();
  const getProjectListing = jest.fn();
  const view = render(
    <SortByComponent
      sortOption="updatedAt_desc"
      handleSortFilter={handleSortFilter}
      getProjectListing={getProjectListing}
      {...props}
    />
  );
  return { ...view, handleSortFilter, getProjectListing };
};

/**
 * antd renders Popover content lazily into a portal on document.body, so the
 * sort options (and renderFilterContent with them) only exist once opened.
 */
const openSortPopover = async () => {
  fireEvent.click(screen.getByRole('button', { name: /sort/i }));
  await waitFor(() => expect(document.querySelector('.filter-content')).not.toBeNull());
};

it('renders the sort options content when opened', async () => {
  setup();
  await openSortPopover();
  expect(document.querySelector('.filter-content')).not.toBeNull();
  expect(screen.getByText('Sort Options')).toBeInTheDocument();
});

it('offers every configured sort option', async () => {
  setup();
  await openSortPopover();
  ['Latest Updated', 'Oldest Updated', 'Name (A-Z)'].forEach((label) =>
    expect(screen.getByText(label)).toBeInTheDocument()
  );
});

it('shows no active-sort badge for the default ordering', () => {
  const { container } = setup({ sortOption: 'updatedAt_desc' });
  expect(container.querySelector('.ant-badge-count')).toBeNull();
});

it('flags a non-default ordering with a badge', () => {
  const { container } = setup({ sortOption: 'title' });
  expect(container.querySelector('.ant-badge-count')).not.toBeNull();
});

it('applies the chosen ordering only when the user confirms', async () => {
  const { handleSortFilter } = setup();
  await openSortPopover();
  fireEvent.click(screen.getByText('Name (A-Z)'));
  // Selecting alone must not filter - it is staged until Apply.
  expect(handleSortFilter).not.toHaveBeenCalledWith('title');
  const applyButtons = screen.getAllByRole('button', { name: /^apply/i });
  fireEvent.click(applyButtons[applyButtons.length - 1]);
  expect(handleSortFilter).toHaveBeenCalledWith('title');
});

it('resets back to the default ordering', async () => {
  const { handleSortFilter } = setup({ sortOption: 'title' });
  await openSortPopover();
  // antd can leave more than one portal node for the popover; act on the live one.
  const resetButtons = screen.getAllByRole('button', { name: /^reset$/i });
  fireEvent.click(resetButtons[resetButtons.length - 1]);
  expect(handleSortFilter).toHaveBeenCalledWith('updatedAt_desc');
});
