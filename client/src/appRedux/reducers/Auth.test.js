import reducer from './Auth';
import {
  HIDE_MESSAGE, INIT_URL, ON_HIDE_LOADER, ON_SHOW_LOADER, SHOW_MESSAGE,
  SIGNIN_USER_SUCCESS, SIGNOUT_USER_SUCCESS, SIGNIN_USER_PERMISSION, SIGNIN_USER_ROLE,
} from '../../constants/ActionTypes';

const initial = () => reducer(undefined, { type: '@@INIT' });

it('starts signed out with no message', () => {
  expect(initial()).toMatchObject({ loader: false, alertMessage: '', showMessage: false, initURL: '' });
});

it('returns the same state for an unknown action', () => {
  const s = initial();
  expect(reducer(s, { type: 'NOPE' })).toBe(s);
});

it('stores the signed-in user', () => {
  const user = { _id: 'u1', email: 'a@b.com' };
  expect(reducer(initial(), { type: SIGNIN_USER_SUCCESS, payload: user }).authUser).toEqual(user);
});

it('stores permissions and role separately from the user', () => {
  let s = reducer(initial(), { type: SIGNIN_USER_PERMISSION, payload: [1, 2] });
  expect(s.userPermission).toEqual([1, 2]);
  s = reducer(s, { type: SIGNIN_USER_ROLE, payload: 'role-1' });
  expect(s.userRole).toBe('role-1');
});

it('records the initial URL', () => {
  expect(reducer(initial(), { type: INIT_URL, payload: '/acme/tasks' }).initURL).toBe('/acme/tasks');
});

it('clears the session and resets the URL on sign out', () => {
  const signedIn = reducer(initial(), { type: SIGNIN_USER_SUCCESS, payload: { _id: 'u1' } });
  const s = reducer(signedIn, { type: SIGNOUT_USER_SUCCESS });
  expect(s).toMatchObject({ authUser: null, initURL: '/', loader: false });
});

it('shows and hides alert messages', () => {
  const shown = reducer(initial(), { type: SHOW_MESSAGE, payload: 'Bad credentials' });
  expect(shown).toMatchObject({ alertMessage: 'Bad credentials', showMessage: true, loader: false });
  expect(reducer(shown, { type: HIDE_MESSAGE })).toMatchObject({ alertMessage: '', showMessage: false });
});

it('toggles the loader', () => {
  const on = reducer(initial(), { type: ON_SHOW_LOADER });
  expect(on.loader).toBe(true);
  expect(reducer(on, { type: ON_HIDE_LOADER }).loader).toBe(false);
});
