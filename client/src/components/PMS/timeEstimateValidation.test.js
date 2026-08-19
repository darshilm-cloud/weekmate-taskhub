/**
 * Estimated-hours validation guard (TimeForPMS).
 *
 * Same dead-branch fix as the task controllers: estHrs/estMins are useState("")
 * strings, so `estHrs === 0` never matched. TimeForPMS is a component rather
 * than a hook, so AddTimeModal is mocked to capture the handlers it receives -
 * onFinish is the guarded submit, handleEstTimeInput sets the fields.
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

let modalProps = {};
jest.mock('../Modal/AddTimeModal', () => ({
  __esModule: true,
  default: (props) => {
    modalProps = props;
    return null;
  },
}));

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    putMethod: 'PUT',
    makeAPICall: jest.fn().mockResolvedValue({ data: { status: 1, data: [] } }),
  },
}));

jest.mock('../../cacheDB', () => ({
  __esModule: true,
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  clearCachedData: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import TimeForPMS from './TimeForPMS';

const setup = async () => {
  modalProps = {};
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/acme/project/p1']}>
        <TimeForPMS />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(typeof modalProps.onFinish).toBe('function'));
};

const setEstimate = async (hrs, mins) => {
  await act(async () => {
    if (hrs !== undefined) modalProps.handleEstTimeInput('est_hrs', hrs);
  });
  await act(async () => {
    if (mins !== undefined) modalProps.handleEstTimeInput('est_mins', mins);
  });
};

const submit = async () => {
  await act(async () => {
    await modalProps.onFinish({ descriptions: '' });
  });
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
});

it('asks for both fields when the estimate is completely empty', async () => {
  await setup();
  await submit();
  expect(modalProps.estHrsError).toBe('Enter hours');
  expect(modalProps.estMinsError).toBe('Enter minutes');
});

it('rejects a zero hours entry with no minutes', async () => {
  await setup();
  await setEstimate('0', undefined);
  await submit();
  // The branch that was dead before the fix: "0" === 0 is false for a string.
  expect(modalProps.estHrsError).toBe('Enter estimated hours');
});

it('rejects a zero minutes entry with no hours', async () => {
  await setup();
  await setEstimate(undefined, '0');
  await submit();
  expect(modalProps.estMinsError).toBeTruthy();
});

it('does not raise the zero-hours error for a real estimate', async () => {
  await setup();
  await setEstimate('5', undefined);
  await submit();
  expect(modalProps.estHrsError).not.toBe('Enter estimated hours');
});

it('does not raise the zero-hours error when minutes were supplied', async () => {
  await setup();
  await setEstimate('0', '30');
  await submit();
  expect(modalProps.estHrsError).not.toBe('Enter estimated hours');
});
