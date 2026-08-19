/**
 * AddTaskModal submit pipeline.
 *
 * AddTaskModal is a thin controller over CommonTaskFormModal: all of its logic
 * lives in handleSubmit. The modal is mocked so its onSubmit can be invoked
 * directly, which exercises the real stage resolution, the reserved-key skip in
 * the custom-field loop, and the estimate splitting - the new-code lines Sonar
 * flags - without mounting the 2,300-line form.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

let submitFn;
jest.mock('./CommonTaskFormModal', () => ({
  __esModule: true,
  default: (props) => {
    submitFn = props.onSubmit;
    return null;
  },
}));

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    postMethod: 'POST',
    getProjectBoardTasks: '/board/tasks',
    taskaddition: '/task/add',
    fileUpload: '/upload',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import AddTaskModal from './AddTaskModal';

const STAGE_TODO = '111111111111111111111111';
const STAGE_DOING = '222222222222222222222222';

const boardColumns = [
  { workflowStatus: { _id: STAGE_TODO, title: 'To Do' } },
  { workflowStatus: { _id: STAGE_DOING, title: 'In Progress' } },
];

const mockApi = ({ board = boardColumns, addOk = true } = {}) => {
  Service.makeAPICall.mockImplementation(({ api_url }) => {
    if (api_url === '/board/tasks') return Promise.resolve({ data: { data: board } });
    if (api_url === '/task/add') {
      return Promise.resolve({ data: { status: addOk, message: 'ok', data: { _id: 'new-task' } } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
};

const renderModal = (props = {}) =>
  render(
    <AddTaskModal
      open
      onCancel={() => {}}
      onSuccess={props.onSuccess || (() => {})}
      projectId="proj-1"
      mainTaskId="list-1"
      {...props}
    />
  );

const submit = async (values) => {
  await act(async () => {
    await submitFn(values);
  });
  return Service.makeAPICall.mock.calls.map((c) => c[0]).find((c) => c.api_url === '/task/add');
};

beforeEach(() => {
  Service.makeAPICall.mockReset();
  submitFn = undefined;
});

describe('estimate splitting', () => {
  it.each([
    ['a whole number', 4, { estimated_hours: '4', estimated_minutes: '00' }],
    ['a half hour', 1.5, { estimated_hours: '1', estimated_minutes: '30' }],
    ['a value that rounds to 59 minutes', 2.99, { estimated_hours: '2', estimated_minutes: '59' }],
    ['zero', 0, { estimated_hours: '0', estimated_minutes: '00' }],
    ['an empty string', '', { estimated_hours: '00', estimated_minutes: '00' }],
    ['null', null, { estimated_hours: '00', estimated_minutes: '00' }],
    ['undefined', undefined, { estimated_hours: '00', estimated_minutes: '00' }],
    ['a negative value', -1, { estimated_hours: '00', estimated_minutes: '00' }],
    ['a non-numeric string', 'two hours', { estimated_hours: '00', estimated_minutes: '00' }],
  ])('sends %s as hours and minutes', async (_l, input, expected) => {
    mockApi();
    renderModal();
    const body = (await submit({ title: 'T', estimated_hours: input })).body;
    expect(body).toMatchObject(expected);
  });
});

describe('stage resolution', () => {
  it('uses the requested stage id when the board contains it', async () => {
    mockApi();
    renderModal({ initialStatusId: STAGE_DOING });
    const body = (await submit({ title: 'T' })).body;
    expect(body.task_status).toBe(STAGE_DOING);
  });

  it('matches a stage by title, ignoring case, spacing and separators', async () => {
    mockApi();
    renderModal({ initialStatusMeta: { title: '  in-progress  ' } });
    const body = (await submit({ title: 'T' })).body;
    expect(body.task_status).toBe(STAGE_DOING);
  });

  it('falls back to the first board column when nothing matches', async () => {
    mockApi();
    renderModal({ initialStatusMeta: { title: 'Nonexistent Stage' } });
    const body = (await submit({ title: 'T' })).body;
    expect(body.task_status).toBe(STAGE_TODO);
  });

  it('falls back to the requested id when the board lookup fails', async () => {
    Service.makeAPICall.mockImplementation(({ api_url }) => {
      if (api_url === '/board/tasks') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: { status: true, message: 'ok', data: {} } });
    });
    renderModal({ initialStatusId: STAGE_DOING });
    const body = (await submit({ title: 'T' })).body;
    expect(body.task_status).toBe(STAGE_DOING);
  });

  it('does not attempt the request when no stage can be resolved', async () => {
    mockApi({ board: [] });
    renderModal();
    const call = await submit({ title: 'T' });
    expect(call).toBeUndefined();
  });

  it('does not attempt the request without a project and list', async () => {
    mockApi();
    renderModal({ standalone: true });
    const call = await submit({ title: 'T' });   // standalone reads ids from values
    expect(call).toBeUndefined();
  });
});

describe('custom fields', () => {
  it('skips reserved form keys so they are not duplicated into custom_fields', async () => {
    mockApi();
    renderModal();
    const body = (
      await submit({
        title: 'T',
        custom_fields: { region: 'EU' },
        taskFormFields: [
          { key: 'title', type: 'text' },
          { key: 'estimated_hours', type: 'text' },
          { key: '', type: 'text' },
          { key: 'region', type: 'text' },
        ],
      })
    ).body;
    expect(body.custom_fields).toEqual({ region: 'EU' });
    expect(body.custom_fields).not.toHaveProperty('title');
  });

  it('nulls a file custom field that carries no real File', async () => {
    mockApi();
    renderModal();
    const body = (
      await submit({
        title: 'T',
        custom_fields: { attachment: 'not-a-file' },
        taskFormFields: [{ key: 'attachment', type: 'file' }],
      })
    ).body;
    expect(body.custom_fields.attachment).toBeNull();
  });
});

describe('request body and outcome', () => {
  it('trims the title and applies defaults', async () => {
    mockApi();
    renderModal();
    const body = (await submit({ title: '  Spaced  ' })).body;
    expect(body).toMatchObject({
      title: 'Spaced',
      status: 'active',
      priority: 'Low',
      project_id: 'proj-1',
      main_task_id: 'list-1',
      assignees: [],
      task_labels: [],
    });
  });

  it('notifies the caller and broadcasts a task-created event on success', async () => {
    mockApi();
    const onSuccess = jest.fn();
    const events = [];
    const listener = (e) => events.push(e.detail);
    window.addEventListener('weekmate:task-created', listener);
    renderModal({ onSuccess });
    await submit({ title: 'T' });
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ _id: 'new-task' }));
    expect(events[0]).toMatchObject({ projectId: 'proj-1', mainTaskId: 'list-1' });
    window.removeEventListener('weekmate:task-created', listener);
  });

  it('does not report success when the API rejects the task', async () => {
    mockApi({ addOk: false });
    const onSuccess = jest.fn();
    renderModal({ onSuccess });
    await submit({ title: 'T' });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
