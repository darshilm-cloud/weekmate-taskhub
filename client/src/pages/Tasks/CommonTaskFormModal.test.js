/**
 * CommonTaskFormModal form presets and derived display.
 *
 * Covers the new-code lines Sonar flags: the create-mode start/end date presets,
 * the start-date change that pushes end_date forward, the estimated-hours field
 * rendering, and the total-assigned-hours readout with its fallback chain.
 */
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';

jest.mock('@ckeditor/ckeditor5-react', () => ({
  __esModule: true,
  CKEditor: () => null,
}));
jest.mock('ckeditor5-custom-build/build/ckeditor', () => ({ __esModule: true, default: {} }));

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    getTaskFormConfig: '/task-form/config',
    myProjects: '/project/my',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import CommonTaskFormModal from './CommonTaskFormModal';

const FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'estimated_hours', label: 'Estimated Hours', type: 'number' },
];

const mockApi = () =>
  Service.makeAPICall.mockImplementation(({ api_url }) => {
    if (api_url === '/task-form/config') {
      return Promise.resolve({ data: { status: 1, data: { fields: FIELDS } } });
    }
    return Promise.resolve({ status: 200, data: { status: 1, data: [] } });
  });

/**
 * NOTE: the component memoises its form config in a module-level cache that
 * outlives individual tests. Re-requiring it under jest.resetModules() is not an
 * option - that hands the component a second React instance and every hook
 * throws - so tests wait on rendered output rather than on the fetch, which only
 * happens on the first render of the file.
 */
const renderModal = async (props = {}) => {
  const view = render(
    <CommonTaskFormModal
      open
      mode="create"
      title="Add Task"
      onCancel={() => {}}
      onSubmit={() => {}}
      {...props}
    />
  );
  await waitFor(() => expect(dateInputs().length).toBeGreaterThanOrEqual(2));
  return view;
};

const dateInputs = () => Array.from(document.querySelectorAll('.ant-picker-input input'));

beforeEach(() => {
  Service.makeAPICall.mockReset();
  mockApi();
});

describe('create-mode date presets', () => {
  it('defaults the start date to today and the end date to a week later', async () => {
    await renderModal();
    const [start, end] = dateInputs();
    await waitFor(() => expect(start.value).toBe(dayjs().format('DD-MM-YYYY')));
    expect(end.value).toBe(dayjs().add(1, 'week').format('DD-MM-YYYY'));
  });

  it('honours supplied initial dates instead of the presets', async () => {
    await renderModal({
      mode: 'edit',
      initialValues: {
        start_date: dayjs('2026-03-02'),
        end_date: dayjs('2026-03-09'),
      },
    });
    const [start, end] = dateInputs();
    await waitFor(() => expect(start.value).toBe('02-03-2026'));
    expect(end.value).toBe('09-03-2026');
  });

  it('leaves both dates empty in edit mode when the task has none', async () => {
    await renderModal({ mode: 'edit', initialValues: {} });
    const [start, end] = dateInputs();
    expect(start.value).toBe('');
    expect(end.value).toBe('');
  });
});

describe('estimated hours field', () => {
  /**
   * The total-assigned-hours readout is derived in a useMemo whose fallback
   * chain is estimated_hours -> hours_assigned -> custom_fields.hours_assigned
   * -> initialValues. That memo runs on every render, but the string it produces
   * is only painted inside a logged-hours entry, which needs a saved task and a
   * time log. These tests therefore drive the same inputs and assert on the
   * field itself, which is the part a user can actually see here.
   */
  it('renders the estimated-hours field as a non-negative number input', async () => {
    await renderModal();
    const numberInput = document.querySelector('input[type="number"]');
    expect(numberInput).not.toBeNull();
    expect(numberInput).toHaveAttribute('min', '0');
  });

  it('prefills the estimate from initialValues', async () => {
    await renderModal({ mode: 'edit', initialValues: { estimated_hours: 6 } });
    await waitFor(() =>
      expect(document.querySelector('input[type="number"]').value).toBe('6')
    );
  });

  it('leaves the estimate blank when the task has none', async () => {
    await renderModal({ mode: 'edit', initialValues: {} });
    expect(document.querySelector('input[type="number"]').value).toBe('');
  });

  it('accepts an edited estimate', async () => {
    await renderModal({ mode: 'edit', initialValues: { estimated_hours: 2 } });
    const numberInput = document.querySelector('input[type="number"]');
    await waitFor(() => expect(numberInput.value).toBe('2'));
    await act(async () => {
      fireEvent.change(numberInput, { target: { value: '9' } });
    });
    await waitFor(() => expect(numberInput.value).toBe('9'));
  });

  it('renders with a locked main task id supplied by the caller', async () => {
    await renderModal({ lockedMainTaskId: 'list-77', showListSelector: false });
    expect(document.querySelector('input[type="number"]')).not.toBeNull();
  });
});

describe('start date keeps the end date consistent', () => {
  /** antd DatePicker: type into the input and commit with Enter. */
  const setDate = async (input, value) => {
    await act(async () => {
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.blur(input);
    });
  };

  it('fills in an end date a week out when the task has none yet', async () => {
    // Note the picker's own disabledDate blocks choosing a start AFTER an
    // existing end date, so the auto-fill branch is only reachable when end_date
    // is empty - which is the case this covers.
    await renderModal({ mode: 'edit', initialValues: { start_date: dayjs('2026-03-02') } });
    const [start, end] = dateInputs();
    await waitFor(() => expect(end.value).toBe(''));

    await setDate(start, '10-03-2026');

    await waitFor(() => expect(end.value).toBe('17-03-2026')); // start + 1 week
  });

  it('leaves an end date that is already after the new start date alone', async () => {
    await renderModal({
      mode: 'edit',
      initialValues: { start_date: dayjs('2026-03-02'), end_date: dayjs('2026-04-30') },
    });
    const [start, end] = dateInputs();
    await waitFor(() => expect(end.value).toBe('30-04-2026'));

    await setDate(start, '05-03-2026');   // still well before the end date

    await waitFor(() => expect(end.value).toBe('30-04-2026'));
  });

  it('does not rewrite dates in view-only mode', async () => {
    await renderModal({
      mode: 'view',
      viewOnly: true,
      initialValues: { start_date: dayjs('2026-03-02'), end_date: dayjs('2026-03-05') },
    });
    const [start, end] = dateInputs();
    await setDate(start, '10-03-2026');
    await waitFor(() => expect(end.value).toBe('05-03-2026'));
  });
});
