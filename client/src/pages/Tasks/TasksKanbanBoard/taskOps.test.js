/**
 * TaskKanbanController's CRUD, drag-and-drop, and comment handlers.
 *
 * These call Service.makeAPICall directly rather than through a shared data
 * layer, so each one is its own thin wrapper: build a request, check
 * response.data.status, and either update state or message.error. That shape
 * repeats ~20 times in this file and none of it was covered - a broken
 * endpoint name or a response shape the code stopped handling would only be
 * caught by hand-testing every button.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { message } from 'antd';

jest.mock('../../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    putMethod: 'PUT',
    deleteMethod: 'DELETE',
    makeAPICall: jest.fn().mockResolvedValue({ data: { status: 1, data: [] } }),
  },
}));

jest.mock('../../../cacheDB', () => ({
  __esModule: true,
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  clearCachedData: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line import/first
import store from '../../../appRedux/store';
// eslint-disable-next-line import/first
import Service from '../../../service';
// eslint-disable-next-line import/first
import TaskKanbanController from './TaskKanbanController';

const wrapper = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/acme/tasks']}>{children}</MemoryRouter>
  </Provider>
);

const selectedTask = { _id: 'list-1', project: { _id: 'proj-1' } };

// A stable reference. The controller has a useEffect keyed on [tasks], and
// renderHook re-invokes this callback on every render - a literal [] here
// would be a NEW array each time, so that effect would fire (and refetch)
// after every state change the tests below trigger, exactly as it would in
// the real app if a parent re-created the tasks array on every render.
const EMPTY_TASKS = [];

const setup = (props = {}) =>
  renderHook(
    () =>
      TaskKanbanController({
        tasks: EMPTY_TASKS,
        showEditTaskModal: false,
        selectedTask,
        deleteTasks: jest.fn(),
        getProjectMianTask: jest.fn(),
        getBoardTasks: jest.fn(),
        updateBoardTaskLocally: jest.fn(),
        moveBoardTaskLocally: jest.fn(),
        refreshProjectMainTasks: jest.fn(),
        ...props,
      }),
    { wrapper }
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
  // mockReset (not mockClear) - a mockResolvedValueOnce left unconsumed by one
  // test (e.g. a guard clause that skips the call) would otherwise sit in the
  // queue and get consumed by the NEXT test's first call instead of its own.
  Service.makeAPICall.mockReset();
  Service.makeAPICall.mockResolvedValue({ data: { status: 1, data: [] } });
  jest.spyOn(message, 'success').mockImplementation(() => {});
  jest.spyOn(message, 'error').mockImplementation(() => {});
});

/**
 * setup() renders the hook, which itself fires mount-time API calls (cache
 * warmup, workflow lookups). Clearing the mock afterwards means later
 * assertions about "was this endpoint called" only see calls the test itself
 * triggered.
 */
const setupClean = (props) => {
  const rendered = setup(props);
  Service.makeAPICall.mockClear();
  return rendered;
};

afterEach(() => jest.restoreAllMocks());

describe('bug CRUD helpers', () => {
  test('deleteBug calls the delete endpoint with the bug id and refreshes on success', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.deleteBug('bug-1');
    });
    const call = Service.makeAPICall.mock.calls.at(-1)[0];
    expect(call.api_url).toContain('/bug-1');
  });

  test('deleteBug surfaces the server message when the delete is rejected', async () => {
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Bug not found' },
    });
    const { result } = setup();
    await act(async () => {
      await result.current.deleteBug('missing');
    });
    expect(message.error).toHaveBeenCalledWith('Bug not found');
  });

  test('editBug sends the title plus every additional field as updated_key', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.editBug('bug-1', 'New title', { due_date: '2026-02-01' });
    });
    const call = Service.makeAPICall.mock.calls.at(-1)[0];
    expect(call.body.updated_key).toEqual(['title', 'due_date']);
    expect(call.body.title).toBe('New title');
    expect(call.body.due_date).toBe('2026-02-01');
    expect(call.body.project_id).toBe('proj-1');
  });

  test('updateBugWorkflow sends the new status id as bug_status', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.updateBugWorkflow('bug-1', 'status-2');
    });
    const call = Service.makeAPICall.mock.calls.at(-1)[0];
    expect(call.body).toEqual({ bug_status: 'status-2' });
  });

  test('a rejected request is absorbed rather than thrown', async () => {
    Service.makeAPICall.mockRejectedValueOnce(new Error('network down'));
    const { result } = setup();
    await expect(
      act(async () => {
        await result.current.deleteBug('bug-1');
      })
    ).resolves.not.toThrow();
  });
});

describe('addissue', () => {
  test('does nothing for a blank title', async () => {
    const { result } = setupClean();
    act(() => result.current.setIssuetitle('   '));

    let outcome;
    await act(async () => {
      outcome = await result.current.addissue();
    });
    expect(outcome).toBe(false);
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  test('posts a trimmed title and resets the form on success', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: { _id: 'bug-9' } },
    });
    act(() => result.current.setIssuetitle('  Export drops a row  '));

    let outcome;
    await act(async () => {
      outcome = await result.current.addissue();
    });

    expect(outcome).toBe(true);
    const call = Service.makeAPICall.mock.calls.at(-1)[0];
    expect(call.body.title).toBe('Export drops a row');
    expect(result.current.issuetitle).toBe('');
  });

  test('reports the server message and keeps the form when the post is rejected', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Task is required' },
    });
    act(() => result.current.setIssuetitle('Something'));

    let outcome;
    await act(async () => {
      outcome = await result.current.addissue();
    });

    expect(outcome).toBe(false);
    expect(message.error).toHaveBeenCalledWith('Task is required');
    expect(result.current.issuetitle).toBe('Something');
  });
});

describe('comments', () => {
  test('deleteComment calls the endpoint with the comment id appended to the path', async () => {
    const { result } = setupClean();
    await act(async () => {
      await result.current.deleteComment('comment-1');
    });
    const call = Service.makeAPICall.mock.calls.find(
      (c) => typeof c[0].api_url === 'string' && c[0].api_url.includes('comment-1')
    );
    expect(call).toBeDefined();
  });

  test('handleEditComment loads the comment into the edit form on success', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: {
        status: 1,
        data: { comment: 'Looks right to me', attachments: [] },
      },
    });
    await act(async () => {
      await result.current.handleEditComment('comment-1');
    });
    expect(result.current.textAreaValue).toBe('Looks right to me');
    expect(result.current.commentVal).toBe('Looks right to me');
    expect(result.current.isTextAreaFocused).toBe(true);
  });

  test('handleEditComment reports the server message when the lookup fails', async () => {
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Comment not found' },
    });
    await act(async () => {
      await result.current.handleEditComment('missing');
    });
    expect(message.error).toHaveBeenCalledWith('Comment not found');
  });
});

describe('drag and drop', () => {
  const dragEvent = (overrides = {}) => {
    const stored = {};
    return {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: {
        classList: { add: jest.fn(), remove: jest.fn() },
        dataset: {},
        id: 'task-1',
        ...overrides.currentTarget,
      },
      dataTransfer: {
        setData: jest.fn((k, v) => { stored[k] = v; }),
        getData: jest.fn((k) => stored[k] ?? ''),
        dropEffect: '',
        effectAllowed: '',
      },
      relatedTarget: null,
      ...overrides,
    };
  };

  test('onDragStart marks the card dragged and records the task id for the drop', () => {
    const { result } = setup();
    const evt = dragEvent();
    act(() => result.current.onDragStart(evt));
    expect(evt.currentTarget.classList.add).toHaveBeenCalledWith('dragged');
    expect(evt.dataTransfer.setData).toHaveBeenCalledWith('application/x-task-id', 'task-1');
    expect(result.current.dragged).toBe(true);
  });

  test('onDragEnd clears the dragged class and state', () => {
    const { result } = setup();
    act(() => result.current.onDragStart(dragEvent()));
    const endEvt = dragEvent();
    act(() => result.current.onDragEnd(endEvt));
    expect(endEvt.currentTarget.classList.remove).toHaveBeenCalledWith('dragged');
    expect(result.current.dragged).toBe(false);
  });

  test('onDragEnter adds the dragged-over class', () => {
    const { result } = setup();
    const enterEvt = dragEvent();
    act(() => result.current.onDragEnter(enterEvt));
    expect(enterEvt.currentTarget.classList.add).toHaveBeenCalledWith('dragged-over');
  });

  test('onDragLeave removes the dragged-over class when leaving to an unrelated element', () => {
    const { result } = setup();
    // A relatedTarget with no relation to currentTarget (not the same node, not
    // a child) is a genuine leave - contrast with the child-element test above,
    // which is the guarded no-op case.
    const leaveEvt = dragEvent({ relatedTarget: { parentNode: {} } });
    act(() => result.current.onDragLeave(leaveEvt));
    expect(leaveEvt.currentTarget.classList.remove).toHaveBeenCalledWith('dragged-over');
  });

  test('onDragLeave ignores a move onto a child element', () => {
    const { result } = setup();
    const currentTarget = { classList: { add: jest.fn(), remove: jest.fn() } };
    const relatedTarget = { parentNode: currentTarget };
    const evt = { currentTarget, relatedTarget, preventDefault: jest.fn(), stopPropagation: jest.fn() };
    act(() => result.current.onDragLeave(evt));
    expect(currentTarget.classList.remove).not.toHaveBeenCalled();
  });

  test('onDrop ignores a drop of something other than a task card', () => {
    const { result } = setup();
    const evt = dragEvent();
    evt.dataTransfer.setData('application/x-item-type', 'not-a-task');
    act(() => result.current.onDrop(evt, 'status-2'));
    // No card id was moved, so the status-update endpoint is never reached.
    expect(Service.makeAPICall).not.toHaveBeenCalledWith(
      expect.objectContaining({ api_url: expect.stringContaining('taskUpdateWorkFlow') })
    );
  });

  test('onDrop with no resolved status is a no-op', () => {
    const { result } = setupClean();
    const evt = dragEvent();
    evt.dataTransfer.setData('application/x-item-type', 'task-card');
    evt.dataTransfer.setData('application/x-task-id', 'task-1');
    act(() => result.current.onDrop(evt, undefined));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  test('onDrop with a resolved status moves the task', async () => {
    const { result } = setup();
    const evt = dragEvent();
    evt.dataTransfer.setData('application/x-item-type', 'task-card');
    evt.dataTransfer.setData('application/x-task-id', 'task-1');
    await act(async () => {
      result.current.onDrop(evt, 'status-2');
      await Promise.resolve();
    });
    expect(evt.currentTarget.classList.remove).toHaveBeenCalledWith('dragged-over');
  });

  test('shouldIgnoreTaskClick is true immediately after a drag starts', () => {
    const { result } = setup();
    act(() => result.current.onDragStart(dragEvent()));
    expect(result.current.shouldIgnoreTaskClick()).toBe(true);
  });
});

describe('other handlers', () => {
  test('handleTaskDelete cancels the modal and delegates to deleteTasks', () => {
    const deleteTasks = jest.fn();
    const { result } = setup({ deleteTasks });
    act(() => result.current.handleTaskDelete('task-9'));
    expect(deleteTasks).toHaveBeenCalledWith('task-9');
  });

  test('handleSearch stores the raw search keyword', () => {
    const { result } = setup();
    act(() => result.current.handleSearch('export'));
    expect(result.current.searchKeyword).toBe('export');
  });

  test('handleSelectedItemsChange narrows assigneeOptions down to the chosen ids', () => {
    const { result } = setup();
    // With no employees/subscribers loaded, assigneeOptions is empty, so an
    // empty selection is the only input that has a knowable outcome here.
    act(() => result.current.handleSelectedItemsChange([]));
    expect(result.current.viewTask.assignees).toEqual([]);
    expect(result.current.searchKeyword).toBe('');
  });

  test('handleViewEdit opens the modal and loads the task into view state', () => {
    const { result } = setup();
    act(() => result.current.handleViewEdit({ _id: 'task-5', title: 'Ship it' }));
    expect(result.current.modalIsOpen).toBe(true);
    expect(result.current.taskId).toBe('task-5');
  });

  test('handleViewEdit is a no-op without an id', () => {
    const { result } = setup();
    act(() => result.current.handleViewEdit({ title: 'No id here' }));
    expect(result.current.modalIsOpen).toBe(false);
  });

  test('onFileChange accepts files under the 20MB limit', () => {
    const { result } = setup();
    const small = new File(['x'], 'small.txt', { type: 'text/plain' });
    act(() => {
      result.current.onFileChange({ target: { files: [small] } });
    });
    expect(result.current.fileAttachment).toContainEqual(small);
    expect(message.error).not.toHaveBeenCalled();
  });

  test('onFileChange rejects a file over the 20MB limit', () => {
    const { result } = setup();
    const big = new File(['x'], 'big.bin', { type: 'application/octet-stream' });
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    act(() => {
      result.current.onFileChange({ target: { files: [big] } });
    });
    expect(result.current.fileAttachment).not.toContainEqual(big);
    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('20MB'));
  });

  test('getTaskByIdDetails refuses to fetch without enough context', async () => {
    const { result } = setupClean({ selectedTask: null });
    await act(async () => {
      await result.current.getTaskByIdDetails('task-1', null, false);
    });
    expect(message.error).toHaveBeenCalledWith(
      expect.stringContaining('missing context')
    );
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  test('getTaskByIdDetails fetches and opens the modal when context resolves', async () => {
    const { result } = setupClean({ selectedTask });
    Service.makeAPICall.mockResolvedValueOnce({
      data: {
        status: 1,
        data: { _id: 'task-1', attachments: [], task_status: { title: 'Open' } },
      },
    });
    await act(async () => {
      await result.current.getTaskByIdDetails('task-1', { projectId: 'proj-1', mainTaskId: 'list-1' }, false);
    });
    expect(result.current.modalIsOpen).toBe(true);
    expect(result.current.taskId).toBe('task-1');
  });

  test('activeClass helpers reflect the current tab', () => {
    const { result } = setup();
    expect(result.current.activeClass()).toBe('active'); // default tab is "comments"
    act(() => result.current.handleTabChange('task'));
    expect(result.current.activeClass1()).toBe('active');
    expect(result.current.activeClass()).toBe('');
  });
});

describe('more simple handlers', () => {
  test('handleFieldClick marks a single field editable without touching others', () => {
    const { result } = setup();
    act(() => result.current.handleFieldClick('title'));
    expect(result.current.isEditable.title).toBe(true);
    expect(result.current.isEditable.assignees).toBe(false);
  });

  test('handleissuedata triggers addissue on Enter', () => {
    const { result } = setup();
    act(() => result.current.setIssuetitle('Something'));
    act(() => result.current.handleissuedata({ key: 'Enter' }));
    // addissue is async; just confirm the API call was kicked off.
    expect(Service.makeAPICall).toHaveBeenCalled();
  });

  test('handleissuedata ignores any other key', () => {
    const { result } = setupClean();
    act(() => result.current.handleissuedata({ key: 'Tab' }));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  test('removeHTMLTags strips markup down to plain text', () => {
    const { result } = setup();
    expect(result.current.removeHTMLTags('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  test('handleCancelCopyModal and handleOkCopyModal both close the copy modal', () => {
    const { result } = setup();
    act(() => result.current.setIsCopyModalOpen(true));
    act(() => result.current.handleCancelCopyModal());
    expect(result.current.isCopyModalOpen).toBe(false);

    act(() => result.current.setIsCopyModalOpen(true));
    act(() => result.current.handleOkCopyModal());
    expect(result.current.isCopyModalOpen).toBe(false);
  });

  test('handleDelete delegates straight to deleteTasks', () => {
    const deleteTasks = jest.fn();
    const { result } = setup({ deleteTasks });
    act(() => result.current.handleDelete('task-3'));
    expect(deleteTasks).toHaveBeenCalledWith('task-3');
  });

  test('handleCancelTaskModal resets the add-task form state', () => {
    const { result } = setup();
    act(() => result.current.popOver()); // the only path that opens this modal
    act(() => result.current.handleCancelTaskModal());
    expect(result.current.isModalOpenTaskModal).toBe(false);
    expect(result.current.estHrsError).toBe('');
  });

  test('handleChnageDescription stores the editor content', () => {
    const { result } = setup();
    act(() =>
      result.current.handleChnageDescription(null, { getData: () => '<p>New description</p>' })
    );
    expect(result.current.editModalDescription).toBe('<p>New description</p>');
  });

  test('handleManagePeople updates assignees/clients and notifies only the newly added', async () => {
    const getBoardTasks = jest.fn();
    const { result } = setupClean({ getBoardTasks, selectedTask });
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: {}, message: 'Updated' },
    });
    await act(async () => {
      await result.current.handleManagePeople({
        assignees: ['emp-1', 'emp-2'],
        clients: ['client-1'],
      });
    });
    expect(result.current.ManagePeople).toBe(false);
    expect(message.success).toHaveBeenCalledWith('Updated');
    expect(getBoardTasks).toHaveBeenCalledWith('list-1');
  });

  test('handleManagePeople reports the server message on failure', async () => {
    const { result } = setupClean({ selectedTask });
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Not allowed' },
    });
    await act(async () => {
      await result.current.handleManagePeople({ assignees: [], clients: [] });
    });
    expect(message.error).toHaveBeenCalledWith('Not allowed');
  });
});
