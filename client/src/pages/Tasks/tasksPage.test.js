/**
 * TasksPMS page mount.
 *
 * A ~4,300 line component that renders the whole project task workspace.
 * Mounting it against a stubbed service layer exercises the initial data
 * plumbing and the shell, and proves the page survives empty and failed
 * responses rather than blanking out.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';

jest.mock('../../service', () => require('../../testUtils/serviceMock')());
jest.mock('../../cacheDB', () => ({
  __esModule: true,
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  clearCachedData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@ckeditor/ckeditor5-react', () => ({ __esModule: true, CKEditor: () => null }));
jest.mock('ckeditor5-custom-build/build/ckeditor', () => ({ __esModule: true, default: {} }));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { renderPage, apiRouter } from '../../testUtils/renderPage';
// eslint-disable-next-line import/first
import TasksPMS from './index';

const STATUS = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const LIST = 'dddddddddddddddddddddddd';

const task = (over = {}) => ({
  _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  title: 'Ship the invoice export',
  descriptions: 'CSV export for finance',
  priority: 'High',
  task_status: { _id: STATUS, title: 'In Progress', color: '#00B4D8' },
  assignees: [{ _id: 'u1', full_name: 'Kunal Shah' }],
  ...over,
});

const withTasks = (tasks) =>
  Service.makeAPICall.mockImplementation(
    apiRouter({
      '/getProjectdetails': {
        status: 200,
        data: { status: 1, data: { _id: 'p1', title: 'WeekMate TaskHub' } },
      },
      '/getProjectMianTask': {
        status: 200,
        data: { status: 1, data: [{ _id: LIST, title: 'Sprint 12' }], metadata: { total: 1 } },
      },
      '/getProjectBoardTasks': {
        status: 200,
        data: {
          status: 1,
          data: [
            {
              _id: STATUS,
              workflowStatus: { _id: STATUS, title: 'In Progress', color: '#00B4D8' },
              total: tasks.length,
              tasks,
            },
          ],
        },
      },
    })
  );

// The page reads :projectId from the route - without it nothing loads.
const mount = () =>
  renderPage(<TasksPMS />, {
    route: '/acme/project/p1/tasks',
    path: '/:companySlug/project/:projectId/tasks',
  });

const calledUrls = () => Service.makeAPICall.mock.calls.map((c) => c[0].api_url);

beforeEach(() => {
  Service.makeAPICall.mockReset();
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
  localStorage.setItem('user_data', JSON.stringify({ _id: 'u1', email: 'a@b.com' }));
});

it('mounts without crashing', async () => {
  withTasks([task()]);
  const { container } = mount();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(container).not.toBeEmptyDOMElement();
});

it('fetches the project and its task lists on load', async () => {
  withTasks([task()]);
  mount();
  await waitFor(() => expect(calledUrls()).toContain('/getProjectMianTask'));
  expect(calledUrls()).toContain('/getProjectdetails');
});

it('renders the workspace shell', async () => {
  withTasks([task()]);
  const { container } = mount();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(container.querySelector('div')).not.toBeNull();
});

it('renders input controls', async () => {
  withTasks([task()]);
  const { container } = mount();
  await waitFor(() => expect(container.querySelector('input')).not.toBeNull());
});

it('survives an empty task list', async () => {
  withTasks([]);
  const { container } = mount();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(container).not.toBeEmptyDOMElement();
});

it('survives every request failing', async () => {
  Service.makeAPICall.mockRejectedValue(new Error('502 upstream'));
  const { container } = mount();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(container).not.toBeEmptyDOMElement();
});

it('survives a malformed response payload', async () => {
  Service.makeAPICall.mockResolvedValue({ status: 200, data: null });
  const { container } = mount();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(container).not.toBeEmptyDOMElement();
});
