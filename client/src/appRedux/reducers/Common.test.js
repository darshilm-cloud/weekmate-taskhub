import reducer from './Common';
import {
  TOGGLE_COLLAPSED_NAV, WINDOW_WIDTH, FETCH_ERROR, FETCH_START, FETCH_SUCCESS,
  HIDE_MESSAGE, SHOW_MESSAGE, SET_FAV_ICON, SET_LOGO, UPDATE_WORKFLOW_STATUS,
} from '../../constants/ActionTypes';

const initial = () => reducer(undefined, { type: '@@INIT' });

it('starts from a sane initial state', () => {
  expect(initial()).toMatchObject({
    error: '', loading: false, message: '', navCollapsed: true,
    pathname: '/', favicon: '', logo: '', task_ids: [],
  });
});

it('returns the same state for an unknown action', () => {
  const s = initial();
  expect(reducer(s, { type: 'NOPE' })).toBe(s);
});

it('tracks the router location and expands the nav on navigation', () => {
  const s = reducer(initial(), {
    type: '@@router/LOCATION_CHANGE',
    payload: { location: { pathname: '/acme/tasks' } },
  });
  expect(s.pathname).toBe('/acme/tasks');
  expect(s.navCollapsed).toBe(false);
});

it('records the window width', () => {
  expect(reducer(initial(), { type: WINDOW_WIDTH, width: 1280 }).width).toBe(1280);
});

it('toggles the collapsed nav', () => {
  expect(reducer(initial(), { type: TOGGLE_COLLAPSED_NAV, navCollapsed: false }).navCollapsed).toBe(false);
});

describe('fetch lifecycle', () => {
  it('FETCH_START sets loading and clears prior error/message', () => {
    const dirty = { ...initial(), error: 'old', message: 'old' };
    expect(reducer(dirty, { type: FETCH_START })).toMatchObject({ loading: true, error: '', message: '' });
  });

  it('FETCH_SUCCESS clears loading', () => {
    expect(reducer(initial(), { type: FETCH_SUCCESS })).toMatchObject({ loading: false, error: '', message: '' });
  });

  it('FETCH_ERROR records the error and clears the message', () => {
    const s = reducer(initial(), { type: FETCH_ERROR, payload: 'boom' });
    expect(s).toMatchObject({ loading: false, error: 'boom', message: '' });
  });
});

it('SHOW_MESSAGE stores the message and clears any error', () => {
  const s = reducer({ ...initial(), error: 'old' }, { type: SHOW_MESSAGE, payload: 'saved' });
  expect(s).toMatchObject({ message: 'saved', error: '', loading: false });
});

it('HIDE_MESSAGE clears both message and error', () => {
  const s = reducer({ ...initial(), error: 'e', message: 'm' }, { type: HIDE_MESSAGE });
  expect(s).toMatchObject({ message: '', error: '', loading: false });
});

it.each([
  [SET_FAV_ICON, 'favicon', 'fav.ico'],
  [SET_LOGO, 'logo', 'logo.png'],
  [UPDATE_WORKFLOW_STATUS, 'task_ids', ['t1', 't2']],
])('%s stores its payload under %s', (type, key, payload) => {
  const s = reducer(initial(), { type, payload });
  expect(s[key]).toEqual(payload);
  expect(s.loading).toBe(false);
});

it('never mutates the state it was given', () => {
  const s = initial();
  const copy = JSON.parse(JSON.stringify(s));
  reducer(s, { type: FETCH_ERROR, payload: 'boom' });
  expect(JSON.parse(JSON.stringify(s))).toEqual(copy);
});
