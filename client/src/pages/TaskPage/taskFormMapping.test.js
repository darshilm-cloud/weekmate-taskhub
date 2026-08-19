/**
 * TaskPage task -> form mapping.
 *
 * mapTaskToEditFormInitial / getTaskProjectId / parseEstimatedHoursForApi are
 * module-private, so they are exercised the way the app uses them: TaskPage is
 * rendered, a task is auto-opened via ?taskID=, and CommonTaskFormModal is
 * mocked purely to capture the initialValues it receives. That runs the real
 * mapper while avoiding the 2,300-line modal.
 */
import React from 'react';
import { render, waitFor, act, fireEvent, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import dayjs from 'dayjs';

const modalProps = [];
jest.mock('../Tasks/CommonTaskFormModal', () => ({
  __esModule: true,
  default: (props) => {
    modalProps.push(props);
    return null;
  },
}));
jest.mock('../Tasks/AddTaskModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../Tasks/TasksGanttView', () => ({ __esModule: true, default: () => null }));

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    myProjects: '/project/my',
    taskList: '/task/list',
    getworkflow: '/workflow',
    getworkflowStatus: '/workflow-status',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import TaskPage from './index';

const STATUS_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const TASK_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const buildTask = (overrides = {}) => ({
  _id: TASK_ID,
  title: 'Ship the invoice export',
  descriptions: '<p>Export as CSV</p>',
  priority: 'High',
  task_status: { _id: STATUS_ID, title: 'In Progress', color: '#00B4D8' },
  ...overrides,
});

/** Route every endpoint TaskPage touches; only taskList carries the fixture. */
const mockApi = (task) => {
  Service.makeAPICall.mockImplementation(({ api_url }) => {
    if (api_url === '/task/list') {
      return Promise.resolve({
        status: 200,
        data: {
          data: [task],
          metadata: { statusCounts: [{ statusId: STATUS_ID, title: 'In Progress', count: 1, sequence: 1 }] },
        },
      });
    }
    return Promise.resolve({ status: 200, data: { data: [] } });
  });
};

/** Render TaskPage with ?taskID= so the view modal auto-opens on that task. */
const renderAndOpen = async (task) => {
  mockApi(task);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/acme/tasks?taskID=${TASK_ID}`]}>
        <Route path="/:companySlug/tasks" component={TaskPage} />
      </MemoryRouter>
    </Provider>
  );
  // The "view" modal is the one whose initialValues come from the mapper.
  await waitFor(() => {
    const opened = modalProps.filter((p) => p.mode === 'view' && p.open);
    expect(opened.length).toBeGreaterThan(0);
  });
  return modalProps.filter((p) => p.mode === 'view' && p.open).pop();
};

const TASK_EDIT_PERMISSION = '66a1eb2f59058461a372cdd1';

/** hasPermission() reads the user_permission cookie via js-cookie. */
const grantTaskEdit = () => {
  document.cookie = `user_permission=${encodeURIComponent(
    JSON.stringify([TASK_EDIT_PERMISSION])
  )}; path=/`;
};

const clearCookies = () => {
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
    .forEach((n) => {
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

beforeEach(() => {
  modalProps.length = 0;
  Service.makeAPICall.mockReset();
  localStorage.clear();
  clearCookies();
  localStorage.setItem('companyDomain', 'acme');
});

const lastProps = (mode) => modalProps.filter((p) => p.mode === mode).pop();

/**
 * Drive the real view -> edit hand-off: the view modal's onEdit stashes the task
 * and closes, and afterClose then opens the edit modal with it.
 */
const openEditModalFor = async (task) => {
  grantTaskEdit();
  const view = await renderAndOpen(task);
  await act(async () => {
    view.onEdit();
  });
  await act(async () => {
    lastProps('view').afterClose();
  });
  await waitFor(() => expect(lastProps('edit').open).toBe(true));
  return lastProps('edit');
};

describe('mapTaskToEditFormInitial', () => {
  it('maps the core scalar fields onto the form', async () => {
    const p = await renderAndOpen(buildTask());
    expect(p.initialValues).toMatchObject({
      title: 'Ship the invoice export',
      description: '<p>Export as CSV</p>',
      priority: 'High',
    });
  });

  it('defaults priority to Low and title/description to empty strings', async () => {
    const p = await renderAndOpen(buildTask({ title: undefined, descriptions: undefined, priority: undefined }));
    expect(p.initialValues).toMatchObject({ title: '', description: '', priority: 'Low' });
  });

  it('resolves the project id from a populated project object', async () => {
    const p = await renderAndOpen(buildTask({ project: { _id: 'proj-1' } }));
    expect(p.initialValues.project_id).toBe('proj-1');
    expect(p.lockedProjectId).toBe('proj-1');
  });

  it('resolves the project id from a raw project_id string', async () => {
    const p = await renderAndOpen(buildTask({ project_id: 'proj-raw' }));
    expect(p.initialValues.project_id).toBe('proj-raw');
  });

  it('flattens populated assignee objects to their ids, accepting _id or id', async () => {
    const p = await renderAndOpen(
      buildTask({ assignees: [{ _id: 'u1' }, { id: 'u2' }, 'u3'] })
    );
    expect(p.initialValues.assignees).toEqual(['u1', 'u2', 'u3']);
  });

  it('coerces a non-array assignees field to an empty list', async () => {
    const p = await renderAndOpen(buildTask({ assignees: 'not-an-array' }));
    expect(p.initialValues.assignees).toEqual([]);
  });

  it('reads labels from taskLabels when present', async () => {
    const p = await renderAndOpen(buildTask({ taskLabels: [{ _id: 'l1' }, 'l2'] }));
    expect(p.initialValues.task_labels).toEqual(['l1', 'l2']);
  });

  it('falls back to the snake_case task_labels field', async () => {
    const p = await renderAndOpen(buildTask({ task_labels: [{ id: 'l9' }] }));
    expect(p.initialValues.task_labels).toEqual(['l9']);
  });

  it('coerces a non-array label field to an empty list', async () => {
    const p = await renderAndOpen(buildTask({ taskLabels: 'not-an-array' }));
    expect(p.initialValues.task_labels).toEqual([]);
  });

  it('prefers due_date over end_date and wraps dates as dayjs', async () => {
    const p = await renderAndOpen(
      buildTask({ due_date: '2026-07-01T00:00:00.000Z', end_date: '2026-08-01T00:00:00.000Z', start_date: '2026-06-01T00:00:00.000Z' })
    );
    expect(dayjs.isDayjs(p.initialValues.end_date)).toBe(true);
    expect(p.initialValues.end_date.format('YYYY-MM-DD')).toBe('2026-07-01');
    expect(p.initialValues.start_date.format('YYYY-MM-DD')).toBe('2026-06-01');
  });

  it('leaves dates undefined when the task has none', async () => {
    const p = await renderAndOpen(buildTask());
    expect(p.initialValues.start_date).toBeUndefined();
    expect(p.initialValues.end_date).toBeUndefined();
  });

  it.each([
    ['whole hours only', { estimated_hours: '3', estimated_minutes: '0' }, 3],
    ['hours plus minutes', { estimated_hours: '2', estimated_minutes: '30' }, 2.5],
    ['minutes only', { estimated_hours: '0', estimated_minutes: '45' }, 0.75],
    ['non-numeric hours with valid minutes', { estimated_hours: 'abc', estimated_minutes: '30' }, 0.5],
  ])('converts an estimate of %s into decimal hours', async (_l, fields, expected) => {
    const p = await renderAndOpen(buildTask(fields));
    expect(p.initialValues.estimated_hours).toBeCloseTo(expected, 5);
  });

  it.each([
    ['both zero', { estimated_hours: '0', estimated_minutes: '0' }],
    ['both absent', {}],
    ['both unparseable', { estimated_hours: 'x', estimated_minutes: 'y' }],
  ])('leaves the estimate undefined when there is none (%s)', async (_l, fields) => {
    const p = await renderAndOpen(buildTask(fields));
    expect(p.initialValues.estimated_hours).toBeUndefined();
  });

  it('copies custom_fields rather than aliasing the task object', async () => {
    const custom_fields = { region: 'EU' };
    const p = await renderAndOpen(buildTask({ custom_fields }));
    expect(p.initialValues.custom_fields).toEqual({ region: 'EU' });
    expect(p.initialValues.custom_fields).not.toBe(custom_fields);
  });

  it('falls back to an empty object when custom_fields is not an object', async () => {
    const p = await renderAndOpen(buildTask({ custom_fields: 'nope' }));
    expect(p.initialValues.custom_fields).toEqual({});
  });

  it('resolves the main task id from a populated mainTask object', async () => {
    const p = await renderAndOpen(buildTask({ mainTask: { _id: 'list-1' } }));
    expect(p.initialValues.main_task_id).toBe('list-1');
  });

  it('resolves the main task id from a raw main_task_id', async () => {
    const p = await renderAndOpen(buildTask({ main_task_id: 'list-raw' }));
    expect(p.initialValues.main_task_id).toBe('list-raw');
  });
});


describe('edit hand-off and submit', () => {
  it('carries the viewed task into the edit modal with its values mapped', async () => {
    const edit = await openEditModalFor(
      buildTask({ project: { _id: 'proj-9' }, estimated_hours: '1', estimated_minutes: '30' })
    );
    expect(edit.initialValues).toMatchObject({ title: 'Ship the invoice export', project_id: 'proj-9' });
    expect(edit.initialValues.estimated_hours).toBeCloseTo(1.5, 5);
    expect(edit.lockedProjectId).toBe('proj-9');
  });

  it('submits the update with the task status and trimmed title', async () => {
    const edit = await openEditModalFor(buildTask({ project: { _id: 'proj-9' } }));
    await act(async () => {
      await edit.onSubmit({ title: '  Renamed  ', description: 'body', estimated_hours: 2 });
    });
    const update = Service.makeAPICall.mock.calls
      .map((c) => c[0])
      .find((c) => String(c.api_url).includes(TASK_ID));
    expect(update).toBeTruthy();
    expect(update.body.title).toBe('Renamed');
    expect(update.body.project_id).toBe('proj-9');
    expect(update.body.updated_key).toContain('task_status');
  });

  it.each([
    ['a whole number of hours', 3, { estimated_hours: '3', estimated_minutes: '00' }],
    ['a fractional value', 2.5, { estimated_hours: '2', estimated_minutes: '30' }],
    ['a value rounding to 59 minutes', 1.99, { estimated_hours: '1', estimated_minutes: '59' }],
    ['an empty string', '', { estimated_hours: '00', estimated_minutes: '00' }],
    ['null', null, { estimated_hours: '00', estimated_minutes: '00' }],
    ['undefined', undefined, { estimated_hours: '00', estimated_minutes: '00' }],
    ['a negative number', -4, { estimated_hours: '00', estimated_minutes: '00' }],
    ['a non-numeric string', 'abc', { estimated_hours: '00', estimated_minutes: '00' }],
    ['Infinity', Infinity, { estimated_hours: '00', estimated_minutes: '00' }],
  ])('splits %s into hours and minutes for the API', async (_label, input, expected) => {
    const edit = await openEditModalFor(buildTask());
    await act(async () => {
      await edit.onSubmit({ title: 'x', estimated_hours: input });
    });
    const update = Service.makeAPICall.mock.calls
      .map((c) => c[0])
      .find((c) => String(c.api_url).includes(TASK_ID));
    expect(update.body).toMatchObject(expected);
  });

  it('does not copy reserved form keys into custom_fields', async () => {
    const edit = await openEditModalFor(buildTask({ project: { _id: 'proj-9' } }));
    await act(async () => {
      await edit.onSubmit({
        title: 'T',
        custom_fields: { region: 'EU' },
        taskFormFields: [
          { key: 'title', type: 'text' },            // reserved -> skipped
          { key: 'estimated_hours', type: 'text' },  // reserved -> skipped
          { key: '', type: 'text' },                 // no key -> skipped
          { key: 'region', type: 'text' },           // genuine custom field
        ],
      });
    });
    const update = Service.makeAPICall.mock.calls
      .map((c) => c[0])
      .find((c) => String(c.api_url).includes(TASK_ID));
    expect(update.body.custom_fields).toEqual({ region: 'EU' });
    expect(update.body.custom_fields).not.toHaveProperty('title');
    expect(update.body.custom_fields).not.toHaveProperty('estimated_hours');
  });

  it('does nothing when the edit form is submitted with no task loaded', async () => {
    grantTaskEdit();
    await renderAndOpen(buildTask());
    const edit = lastProps('edit');
    // The edit modal is mounted but closed, so taskToEdit is still null.
    await act(async () => {
      await edit.onSubmit({ title: 'ignored' });
    });
    const update = Service.makeAPICall.mock.calls
      .map((c) => c[0])
      .find((c) => String(c.api_url).includes(TASK_ID));
    expect(update).toBeUndefined();
  });

  it('offers no edit affordance without the task_edit permission', async () => {
    const view = await renderAndOpen(buildTask());   // no grantTaskEdit()
    expect(view.onEdit).toBeUndefined();
  });
});

describe('workflow selector auto-resolution', () => {
  const WF_EMPTY = 'cccccccccccccccccccccccc';
  const WF_BUSY = 'dddddddddddddddddddddddd';
  const STATUS_A = 'eeeeeeeeeeeeeeeeeeeeeeee';
  const STATUS_B = 'ffffffffffffffffffffffff';

  /**
   * Two workflows: the first-listed one (which the API default would pick) has a
   * single task, the other has two. The board only renders stages of the selected
   * workflow, so defaulting to the empty one makes the board look broken.
   */
  const mockTwoWorkflows = ({ counts = [1, 2] } = {}) => {
    const tasks = [
      ...Array.from({ length: counts[0] }, (_, i) => ({
        _id: `a${i}`.padEnd(24, '0'),
        title: `A${i}`,
        task_status: { _id: STATUS_A, title: 'Backlog', workflow_id: WF_EMPTY },
      })),
      ...Array.from({ length: counts[1] }, (_, i) => ({
        _id: `b${i}`.padEnd(24, '0'),
        title: `B${i}`,
        task_status: { _id: STATUS_B, title: 'Doing', workflow_id: WF_BUSY },
      })),
    ];
    Service.makeAPICall.mockImplementation(({ api_url }) => {
      if (api_url === '/task/list') {
        return Promise.resolve({
          status: 200,
          data: {
            data: tasks,
            metadata: {
              statusCounts: [
                { statusId: STATUS_A, title: 'Backlog', count: counts[0], sequence: 1, workflowId: WF_EMPTY },
                { statusId: STATUS_B, title: 'Doing', count: counts[1], sequence: 2, workflowId: WF_BUSY },
              ],
            },
          },
        });
      }
      if (api_url === '/workflow') {
        return Promise.resolve({
          status: 200,
          data: {
            data: [
              // The selector labels options from `project_workflow`.
              { _id: WF_EMPTY, project_workflow: 'Standard' },
              { _id: WF_BUSY, project_workflow: 'Engineering' },
            ],
          },
        });
      }
      return Promise.resolve({ status: 200, data: { data: [] } });
    });
  };

  const renderBoard = () =>
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/acme/tasks']}>
          <Route path="/:companySlug/tasks" component={TaskPage} />
        </MemoryRouter>
      </Provider>
    );

  it('switches away from the default workflow when it has no tasks at all', async () => {
    // Standard is first (so the API default picks it) but holds nothing, which is
    // exactly the case that made the board look empty.
    mockTwoWorkflows({ counts: [0, 2] });
    const { container } = renderBoard();
    await waitFor(() => {
      expect(container.querySelector('.task-workflow-select')).not.toBeNull();
    });
    await waitFor(() => {
      expect(container.querySelector('.task-workflow-select')?.textContent).toContain('Engineering');
    });
  });

  it('leaves the default alone as soon as it has any tasks of its own', async () => {
    // Even though Engineering has more, Standard is non-empty, so the selector
    // must not move: the override only rescues a completely empty default.
    mockTwoWorkflows({ counts: [1, 2] });
    const { container } = renderBoard();
    await waitFor(() => {
      expect(container.querySelector('.task-workflow-select')).not.toBeNull();
    });
    await waitFor(() => {
      expect(container.querySelector('.task-workflow-select')?.textContent).toContain('Standard');
    });
  });

  it('lets the user pick a workflow explicitly, overriding the auto-resolution', async () => {
    // Standard is empty, so the board auto-selects Engineering; the user then
    // deliberately switches back and that choice must stick.
    mockTwoWorkflows({ counts: [0, 2] });
    const { container } = renderBoard();
    await waitFor(() =>
      expect(container.querySelector('.task-workflow-select')?.textContent).toContain('Engineering')
    );

    await act(async () => {
      fireEvent.mouseDown(container.querySelector('.task-workflow-select .ant-select-selector'));
    });
    // Options render into a portal on document.body.
    const option = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.ant-select-item-option'))
        .find((el) => el.textContent.trim() === 'Standard');
      expect(found).toBeTruthy();
      return found;
    });
    await act(async () => {
      fireEvent.click(option);
    });
    await waitFor(() =>
      expect(container.querySelector('.task-workflow-select')?.textContent).toContain('Standard')
    );
  });
});
