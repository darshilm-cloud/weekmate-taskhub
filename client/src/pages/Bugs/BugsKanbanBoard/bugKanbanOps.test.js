/**
 * BugsKanbanController's CRUD, drag-and-drop, and comment handlers - the
 * same shape as TasksKanbanBoard/TaskKanbanController.js, tested the same
 * way via renderHook.
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
import BugsKanbanController from './BugsKanbanController';

const wrapper = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/acme/bugs']}>{children}</MemoryRouter>
  </Provider>
);

// Stable reference - a fresh [] literal on every render would re-trigger any
// effect keyed on `tasks`, as found earlier this session in the sibling file.
const EMPTY_TASKS = [];

const setup = (props = {}) =>
  renderHook(
    () =>
      BugsKanbanController({
        tasks: EMPTY_TASKS,
        showEditTaskModal: jest.fn(),
        getBoardTasks: jest.fn(),
        boardTasksBugs: [],
        deleteTasks: jest.fn(),
        ...props,
      }),
    { wrapper }
  );

const setupClean = (props) => {
  const rendered = setup(props);
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

  test('addComments posts the formatted text and clears the draft on success', async () => {
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: { _id: 'comment-1' } },
    });
    const { result } = setupClean();
    act(() => result.current.setTextAreaValue('Looks right to me'));
    await act(async () => {
      await result.current.addComments('bug-1', ['user-1'], null, []);
    });
    const call = Service.makeAPICall.mock.calls.find((c) => c[0].body?.bug_id === 'bug-1');
    expect(call[0].body.comment).toBe('Looks right to me');
    expect(result.current.textAreaValue).toBe('');
  });

  test('addComments reports the server message on failure', async () => {
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 0, message: 'Bug not found' },
    });
    const { result } = setupClean();
    await act(async () => {
      await result.current.addComments('bug-1', [], null, []);
    });
    expect(message.error).toHaveBeenCalledWith('Bug not found');
  });

  test('handleEditComment loads the comment into the edit form on success', async () => {
    // Queue the mock AFTER setupClean(), not before - mockClear() only wipes
    // call history, not queued mockResolvedValueOnce implementations, so a
    // value queued before render would be consumed by the hook's own
    // mount-time calls instead of the call this test cares about.
    const { result } = setupClean();
    Service.makeAPICall.mockResolvedValueOnce({
      data: {
        status: 1,
        data: { comment: 'Original comment', attachments: [] },
      },
    });
    await act(async () => {
      await result.current.handleEditComment('comment-1');
    });
    expect(result.current.textAreaValue).toBe('Original comment');
  });
});

describe('drag and drop', () => {
  const dragEvent = (overrides = {}) => {
    const stored = {};
    return {
      preventDefault: jest.fn(),
      currentTarget: {
        classList: { add: jest.fn(), remove: jest.fn() },
        id: 'bug-1',
        ...overrides.currentTarget,
      },
      dataTransfer: {
        setData: jest.fn((k, v) => { stored[k] = v; }),
        getData: jest.fn((k) => stored[k] ?? ''),
        dropEffect: '',
        effectAllowed: '',
      },
      relatedTarget: undefined,
      ...overrides,
    };
  };

  test('onDragStart marks the card dragged and records the bug id for the drop', () => {
    const { result } = setup();
    const evt = dragEvent();
    act(() => result.current.onDragStart(evt));
    expect(evt.currentTarget.classList.add).toHaveBeenCalledWith('dragged');
    expect(evt.dataTransfer.setData).toHaveBeenCalledWith('application/x-bug-id', 'bug-1');
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

  test('onDragLeave does not throw when the drag leaves the window entirely', () => {
    // Regression: relatedTarget is null in this case, and the handler read
    // newTarget.parentNode with no null guard.
    const { result } = setup();
    const evt = dragEvent({ relatedTarget: null });
    expect(() => act(() => result.current.onDragLeave(evt))).not.toThrow();
  });

  test('onDragLeave removes the dragged-over class for a genuine leave', () => {
    const { result } = setup();
    const evt = dragEvent({ relatedTarget: { parentNode: {} } });
    act(() => result.current.onDragLeave(evt));
    expect(evt.currentTarget.classList.remove).toHaveBeenCalledWith('dragged-over');
  });

  test('onDrop ignores a drop of something other than a bug card', () => {
    const { result } = setupClean();
    const evt = dragEvent();
    evt.dataTransfer.setData('application/x-item-type', 'not-a-bug');
    act(() => result.current.onDrop(evt, 'status-2'));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  test('onDrop with a resolved status moves the bug', async () => {
    const { result } = setupClean();
    const evt = dragEvent();
    evt.dataTransfer.setData('application/x-item-type', 'bug-card');
    evt.dataTransfer.setData('application/x-bug-id', 'bug-1');
    await act(async () => {
      result.current.onDrop(evt, 'status-2');
      await Promise.resolve();
    });
    const call = Service.makeAPICall.mock.calls.find((c) => c[0].body?.bug_status === 'status-2');
    expect(call).toBeDefined();
  });
});

describe('other handlers', () => {
  test('handleTaskDelete delegates to deleteTasks', () => {
    const deleteTasks = jest.fn();
    const { result } = setup({ deleteTasks });
    act(() => result.current.handleTaskDelete('bug-9'));
    expect(deleteTasks).toHaveBeenCalledWith('bug-9');
  });

  test('handleSearch stores the raw search keyword', () => {
    const { result } = setup();
    act(() => result.current.handleSearch('login bug'));
    expect(result.current.searchKeyword).toBe('login bug');
  });

  test('onFileChange rejects a file over the 20MB limit', () => {
    const { result } = setup();
    const big = new File(['x'], 'big.bin', { type: 'application/octet-stream' });
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    act(() => {
      result.current.onFileChange({ target: { files: [big] } });
    });
    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('20MB'));
  });

  test('activeClass helpers reflect the current tab', () => {
    const { result } = setup();
    expect(result.current.activeClass()).toBe('active'); // default tab is "comments"
    act(() => result.current.handleTabChange('task'));
    expect(result.current.activeClass1()).toBe('active');
    expect(result.current.activeClass()).toBe('');
  });

  test('getTaskByIdDetails opens the modal for the fetched bug', async () => {
    Service.makeAPICall.mockResolvedValueOnce({
      data: { status: 1, data: { _id: 'bug-1', attachments: [], bug_status: { title: 'Open' } } },
    });
    const { result } = setupClean();
    await act(async () => {
      await result.current.getTaskByIdDetails('bug-1', null, false);
    });
    expect(result.current.modalIsOpen).toBe(true);
  });
});
