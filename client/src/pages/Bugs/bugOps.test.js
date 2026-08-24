/**
 * BugsController's pure filtering logic, date normalization, and CRUD/handler
 * surface.
 *
 * filterTasks in particular is a dense branch matrix (status, assignees,
 * start/due date in five different shapes, labels, title search) that runs
 * entirely client-side on every board render and had zero coverage.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { message } from 'antd';
import moment from 'moment';

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    putMethod: 'PUT',
    deleteMethod: 'DELETE',
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
import Service from '../../service';
// eslint-disable-next-line import/first
import BugsController from './BugsController';

const wrapper = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/acme/bugs/proj-1']}>
      <Route path="/acme/bugs/:projectId">{children}</Route>
    </MemoryRouter>
  </Provider>
);

const setup = () => renderHook(() => BugsController(), { wrapper });

const setupClean = () => {
  const rendered = setup();
  Service.makeAPICall.mockClear();
  return rendered;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
  Service.makeAPICall.mockReset();
  Service.makeAPICall.mockResolvedValue({ data: { status: 1, data: [] } });
  jest.spyOn(message, 'success').mockImplementation(() => {});
  jest.spyOn(message, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('filterTasks', () => {
  const bug = (overrides = {}) => ({
    bug_status: 'status-open',
    assignees: [],
    bug_labels: [],
    start_date: '2026-01-15',
    due_date: '2026-01-20',
    title: 'Export drops the last row',
    ...overrides,
  });

  const project = (bugs) => ({ _id: 'proj-1', bug_status: 'status-open', bugs });

  test('a project whose status does not match the StatusId filter is emptied', () => {
    const { result } = setup();
    const data = [project([bug()])];
    const filtered = result.current.filterTasks(data, { StatusId: 'status-other' });
    expect(filtered[0].bugs).toEqual([]);
  });

  test('an empty-string StatusId is compared literally, not treated as "no filter"', () => {
    // filters.StatusId || filters.StatusId === "" takes this branch for "",
    // but then compares project.bug_status === "" - which a real status id
    // never equals, so this empties every project. Documenting the actual
    // behavior, not the friendlier behavior the code reads like it intends.
    const { result } = setup();
    const data = [project([bug()])];
    const filtered = result.current.filterTasks(data, { StatusId: '', bugs: {} });
    expect(filtered[0].bugs).toEqual([]);
  });

  test('assigneeIds "unassigned" keeps only bugs with nobody assigned', () => {
    const { result } = setup();
    const data = [
      project([bug({ assignees: [] }), bug({ assignees: [{ _id: 'u1' }] })]),
    ];
    const filtered = result.current.filterTasks(data, {
      bugs: { assigneeIds: 'unassigned' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].assignees).toEqual([]);
  });

  test('a specific assigneeIds list keeps bugs assigned to any of them', () => {
    const { result } = setup();
    const data = [
      project([
        bug({ assignees: [{ _id: 'u1' }] }),
        bug({ assignees: [{ _id: 'u2' }] }),
      ]),
    ];
    const filtered = result.current.filterTasks(data, {
      bugs: { assigneeIds: ['u1'] },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].assignees[0]._id).toBe('u1');
  });

  test('startDate "next7days" keeps bugs starting within the next week', () => {
    // Regression: filterTasks used to reformat bug.start_date to a DD-MM-YYYY
    // STRING and then re-parse that string with moment() with no format hint.
    // moment only understands ISO/RFC2822 without an explicit format, so the
    // re-parse silently produced an invalid date and isBetween() was always
    // false - "Next 7 days" never matched a single bug, for any date, ever.
    const { result } = setup();
    const soon = moment().add(2, 'days').format('YYYY-MM-DD');
    const far = moment().add(40, 'days').format('YYYY-MM-DD');
    const data = [project([bug({ start_date: soon }), bug({ start_date: far })])];
    const filtered = result.current.filterTasks(data, {
      bugs: { startDate: 'next7days' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].start_date).toBe(soon);
  });

  test('startDate "next30days" keeps bugs starting within the next month', () => {
    const { result } = setup();
    const soon = moment().add(10, 'days').format('YYYY-MM-DD');
    const far = moment().add(90, 'days').format('YYYY-MM-DD');
    const data = [project([bug({ start_date: soon }), bug({ start_date: far })])];
    const filtered = result.current.filterTasks(data, {
      bugs: { startDate: 'next30days' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].start_date).toBe(soon);
  });

  test('startDate as a [from, to] array keeps bugs inside that range', () => {
    const { result } = setup();
    const data = [
      project([
        bug({ start_date: '2026-01-15' }),
        bug({ start_date: '2026-03-01' }),
      ]),
    ];
    const filtered = result.current.filterTasks(data, {
      bugs: { startDate: ['2026-01-01', '2026-01-31'] },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].start_date).toBe('2026-01-15');
  });

  test('startDate: null keeps only bugs with no start date at all', () => {
    const { result } = setup();
    const data = [project([bug({ start_date: null }), bug()])];
    const filtered = result.current.filterTasks(data, { bugs: { startDate: null } });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].start_date).toBeNull();
  });

  test('dueDate "next30days" keeps bugs due within the next month', () => {
    const { result } = setup();
    const soon = moment().add(10, 'days').format('YYYY-MM-DD');
    const far = moment().add(90, 'days').format('YYYY-MM-DD');
    const data = [project([bug({ due_date: soon }), bug({ due_date: far })])];
    const filtered = result.current.filterTasks(data, {
      bugs: { dueDate: 'next30days' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
  });

  test('labelIds "unlabelled" keeps only bugs with no labels', () => {
    const { result } = setup();
    const data = [
      project([
        bug({ bug_labels: [] }),
        bug({ bug_labels: [{ _id: 'l1' }] }),
      ]),
    ];
    const filtered = result.current.filterTasks(data, {
      bugs: { labelIds: 'unlabelled' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
  });

  test('a title filter matches case-insensitively', () => {
    const { result } = setup();
    const data = [
      project([bug({ title: 'Export drops a row' }), bug({ title: 'Login is slow' })]),
    ];
    const filtered = result.current.filterTasks(data, {
      bugs: { title: 'EXPORT' },
    });
    expect(filtered[0].bugs).toHaveLength(1);
    expect(filtered[0].bugs[0].title).toBe('Export drops a row');
  });

  test('a project with no bugs left after filtering keeps its shape but empties bugs', () => {
    const { result } = setup();
    const data = [project([bug({ title: 'No match here' })])];
    const filtered = result.current.filterTasks(data, {
      bugs: { title: 'nothing matches this' },
    });
    expect(filtered[0]).toMatchObject({ _id: 'proj-1', bugs: [] });
  });
});

describe('simple state handlers', () => {
  test('handleFilterStatus sets the status only when the checkbox is checked', () => {
    const { result } = setup();
    act(() =>
      result.current.handleFilterStatus({
        target: { value: 'status-open', checked: true },
      })
    );
    expect(result.current.filterStatus).toBe('status-open');

    act(() =>
      result.current.handleFilterStatus({
        target: { value: 'status-open', checked: false },
      })
    );
    expect(result.current.filterStatus).toBe('');
  });

  test('handleSearch stores the raw keyword', () => {
    const { result } = setup();
    act(() => result.current.handleSearch('login bug'));
    expect(result.current.searchKeyword).toBe('login bug');
  });

  test('handleSelectedItemsChange resolves ids against the subscriber list', () => {
    const { result } = setup();
    act(() => result.current.handleSelectedItemsChange(['u1']));
    // With no subscriber list loaded, an unresolved id still becomes a stub
    // { _id } rather than being silently dropped.
    expect(result.current.selectedItems).toEqual([{ _id: 'u1' }]);
    expect(result.current.searchKeyword).toBe('');
  });

  test('handleSelectedItemsChange tolerates a non-array argument', () => {
    const { result } = setup();
    act(() => result.current.handleSelectedItemsChange(undefined));
    expect(result.current.selectedItems).toEqual([]);
  });

  test('handleStartChange enters custom mode for "Custom" and stores a range for a bracketed value', () => {
    const { result } = setup();
    act(() => result.current.handleStartChange('Custom'));
    expect(result.current.selectValStartdate).toBe(true);

    act(() => result.current.handleStartChange('["2026-01-01","2026-01-31"]'));
    expect(result.current.selectValStartdate).toBe(false);
    expect(result.current.filterStartDate).toEqual(['2026-01-01', '2026-01-31']);
  });

  test('handleDueChange stores a plain value as-is', () => {
    const { result } = setup();
    act(() => result.current.handleDueChange('next7days'));
    expect(result.current.filterDueDate).toBe('next7days');
  });

  test('handleStartDueFilter rejects a partial date range', () => {
    const { result } = setup();
    act(() => result.current.handleStartDueFilter(['2026-01-01'], null));
    expect(message.error).toHaveBeenCalledWith('please select both Dates');
  });

  test('handleStartDueFilter accepts a complete range and refreshes the board', async () => {
    const { result } = setupClean();
    await act(async () => {
      result.current.handleStartDueFilter(['2026-01-01', '2026-01-31'], null);
    });
    expect(Service.makeAPICall).toHaveBeenCalled();
  });

  test('handleButtonTask reveals the task selector', () => {
    const { result } = setup();
    act(() => result.current.handleButtonTask());
    expect(result.current.showSelectTask).toBe(true);
  });

  test('handlerAssignes stores the chosen assignees', () => {
    const { result } = setup();
    act(() => result.current.handlerAssignes(['u1', 'u2']));
    expect(result.current.selectedsassignees).toEqual(['u1', 'u2']);
  });

  test('handleAllFilter updates a bugs-scoped property and refreshes the board', async () => {
    const { result } = setupClean();
    await act(async () => {
      result.current.handleAllFilter('assigneeIds', ['u1']);
    });
    expect(result.current.filterSchema.bugs.assigneeIds).toEqual(['u1']);
    expect(Service.makeAPICall).toHaveBeenCalled();
  });

  test('handleAllFilter clearing Status resets the bugs filter scope', () => {
    const { result } = setup();
    act(() => result.current.handleAllFilter('Status', ''));
    expect(result.current.filterSchema).toEqual({ bugs: {} });
  });
});

describe('estimate time', () => {
  test('handleSetEstTime rejects an empty estimate', () => {
    const { result } = setup();
    act(() => result.current.handleSetEstTime());
    expect(message.error).toHaveBeenCalledWith('Enter estimated time');
  });

  test('handleSetEstTime combines hours and minutes once both are set', () => {
    const { result } = setup();
    act(() => result.current.handleEstTimeInput('est_hrs', '2'));
    act(() => result.current.handleEstTimeInput('est_mins', '30'));
    act(() => result.current.handleSetEstTime());
    expect(result.current.estTime).toBe('2:30');
    expect(result.current.isAlterEstimatedTime).toBe(false);
  });

  test('removeEstTIme clears the estimate back to zero', () => {
    const { result } = setup();
    act(() => result.current.handleEstTimeInput('est_hrs', '5'));
    act(() => result.current.removeEstTIme());
    expect(result.current.estTime).toBe('');
    expect(result.current.estHrs).toBe('00');
    expect(result.current.estMins).toBe('00');
  });
});

describe('file attachments', () => {
  test('onFileChange accepts a file under the 20MB limit', () => {
    const { result } = setup();
    const small = new File(['x'], 'small.txt', { type: 'text/plain' });
    act(() => result.current.onFileChange({ target: { files: [small] } }));
    expect(result.current.fileAttachment).toContainEqual(small);
  });

  test('onFileChange rejects a file over the 20MB limit', () => {
    const { result } = setup();
    const big = new File(['x'], 'big.bin', { type: 'application/octet-stream' });
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    act(() => result.current.onFileChange({ target: { files: [big] } }));
    expect(result.current.fileAttachment).not.toContainEqual(big);
    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('20MB'));
  });

  test('removeAttachmentFile drops only the file at that index', () => {
    const { result } = setup();
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');
    act(() => result.current.onFileChange({ target: { files: [a, b] } }));
    act(() => result.current.removeAttachmentFile(0));
    expect(result.current.fileAttachment).toEqual([b]);
  });
});

describe('CRUD calls', () => {
  test('deleteTasks calls the delete endpoint and refreshes on success', async () => {
    const { result } = setupClean();
    await act(async () => {
      await result.current.deleteTasks('bug-1');
    });
    const call = Service.makeAPICall.mock.calls[0][0];
    expect(call.api_url).toContain('bug-1');
    // A second call is the getBoardTasks() refresh triggered on success.
    expect(Service.makeAPICall.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('deleteTasks surfaces the server message on failure without refreshing', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Bug not found' },
    });
    await act(async () => {
      await result.current.deleteTasks('missing');
    });
    expect(message.error).toHaveBeenCalledWith('Bug not found');
    expect(Service.makeAPICall).toHaveBeenCalledTimes(1);
  });

  test('a rejected delete request is absorbed rather than thrown', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockRejectedValueOnce(new Error('network down'));
    await expect(
      act(async () => {
        await result.current.deleteTasks('bug-1');
      })
    ).resolves.not.toThrow();
  });

  test('getWorkflow stores the returned workflow list on success', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: [{ _id: 'wf-1', title: 'To do' }] },
    });
    await act(async () => {
      await result.current.getWorkflow();
    });
    expect(result.current.workflow).toEqual([{ _id: 'wf-1', title: 'To do' }]);
  });

  test('getWorkflow reports the server message on failure', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Could not load workflow' },
    });
    await act(async () => {
      await result.current.getWorkflow();
    });
    expect(message.error).toHaveBeenCalledWith('Could not load workflow');
  });

  test('addProjectMainTask posts the form values and closes the modal on success', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: { _id: 'list-1' }, message: 'Created' },
    });
    await act(async () => {
      await result.current.addProjectMainTask({
        title: 'Backlog',
        workflow_id: 'wf-1',
        task_status: 'status-1',
        isPrivateList: false,
      });
    });
    const call = Service.makeAPICall.mock.calls[0][0];
    expect(call.body.title).toBe('Backlog');
    expect(message.success).toHaveBeenCalledWith('Created');
  });

  test('addProjectMainTask surfaces the server message on failure', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Title already exists' },
    });
    await act(async () => {
      await result.current.addProjectMainTask({ title: 'Backlog' });
    });
    expect(message.error).toHaveBeenCalledWith('Title already exists');
  });
});
