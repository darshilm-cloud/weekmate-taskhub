/**
 * Smoke coverage for ProjectExpencesController.
 *
 * This hook is never imported anywhere else in the codebase - dead code, not
 * wired to any page (it also internally names its function
 * "PositiveReviewController", a copy-paste leftover). Calling it directly
 * still exercises real logic, so it gets a smoke test rather than being left
 * at 0% or deleted outside this task's scope.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import ProjectExpencesController from './ProjectExpencesController';

const wrapper = ({ children }) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={['/acme/project-expenses']}>{children}</MemoryRouter>
  </Provider>
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
});

test('renders without crashing and returns its handler surface', () => {
  const { result } = renderHook(() => ProjectExpencesController(), { wrapper });
  expect(typeof result.current).toBe('object');
});
