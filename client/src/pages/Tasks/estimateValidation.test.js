/**
 * Estimated-hours validation guard (TasksController).
 *
 * estHrs/estMins are useState("") strings, so the original `estHrs === 0` could
 * never be true and the "Enter estimated hours" branch was dead. These tests
 * drive every arm of the guard through the controller's own public surface.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    putMethod: 'PUT',
    makeAPICall: jest.fn().mockResolvedValue({ data: { status: 1, data: [] } }),
  },
}));

// The task cache is Dexie-backed and jsdom has no IndexedDB.
jest.mock('../../cacheDB', () => ({
  __esModule: true,
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  clearCachedData: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import TasksController from './TasksController';

const wrapper = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/acme/tasks']}>{children}</MemoryRouter>
  </Provider>
);

const setup = () =>
  renderHook(
    () =>
      TasksController({ flag: false }),
    { wrapper }
  );

/** Put the estimate fields into a known state via the controller's own input handler. */
const setEstimate = (result, hrs, mins) => {
  act(() => {
    if (hrs !== undefined) result.current.handleEstTimeInput('est_hrs', hrs);
  });
  act(() => {
    if (mins !== undefined) result.current.handleEstTimeInput('est_mins', mins);
  });
};

const submit = async (result) => {
  await act(async () => {
    await result.current.handleTaskOps({ descriptions: '' });
  });
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
});

it('asks for both fields when the estimate is completely empty', async () => {
  const { result } = setup();
  await submit(result);
  expect(result.current.estHrsError).toBe('Enter hours');
  expect(result.current.estMinsError).toBe('Enter minutes');
});

it('rejects a zero hours entry with no minutes', async () => {
  const { result } = setup();
  setEstimate(result, '0', undefined);
  await submit(result);
  // This is the branch that was dead: "0" === 0 is false for a string.
  expect(result.current.estHrsError).toBe('Enter estimated hours');
  expect(result.current.estMinsError).toBe('');
});

it('rejects a zero minutes entry with no hours', async () => {
  const { result } = setup();
  setEstimate(result, undefined, '0');
  await submit(result);
  // This guard does not return, so the later "both cannot be 0" check runs too
  // and has the final say on the message. What matters is that the entry is
  // rejected rather than sailing through as a valid estimate.
  expect(result.current.estMinsError).toBe('Minutes and hours both cannot be 0');
});

it('accepts a non-zero hours entry without flagging the zero-hours error', async () => {
  const { result } = setup();
  setEstimate(result, '5', undefined);
  await submit(result);
  expect(result.current.estHrsError).not.toBe('Enter estimated hours');
});

it('does not flag zero hours when minutes were supplied', async () => {
  const { result } = setup();
  setEstimate(result, '0', '30');
  await submit(result);
  expect(result.current.estHrsError).not.toBe('Enter estimated hours');
});
