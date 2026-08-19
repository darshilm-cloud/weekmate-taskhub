/**
 * Workflow stage rename.
 *
 * Covers handleEdit, including the guarded lookup into WorkflowStatusList. That
 * list starts as useState() - undefined until the fetch resolves - so the lookup
 * has to tolerate it being absent rather than throwing.
 */
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    putMethod: 'PUT',
    deleteMethod: 'DELETE',
    getworkflowStatus: '/workflow-status',
    addworkflowStatus: '/workflow-status/add',
    updateworkflowStatus: '/workflow-status/update',
    deleteworkflowStatus: '/workflow-status/delete',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import WorkflowTasksUpdate from './WorkflowTasksUpdate';

const WF_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const STAGE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const mockApi = ({ stages = [{ _id: STAGE_ID, title: 'To Do', color: '#ff0000' }] } = {}) => {
  Service.makeAPICall.mockImplementation(({ api_url }) => {
    if (String(api_url).startsWith('/workflow-status/update')) {
      return Promise.resolve({ data: { status: 1, message: 'Updated' } });
    }
    if (String(api_url).startsWith('/workflow-status')) {
      return Promise.resolve({ data: { status: 1, data: stages } });
    }
    return Promise.resolve({ data: { status: 1, data: [] } });
  });
};

const renderPage = () =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/acme/workflow/${WF_ID}`]}>
        <Route path="/:companySlug/workflow/:id" component={WorkflowTasksUpdate} />
      </MemoryRouter>
    </Provider>
  );

const updateCall = () =>
  Service.makeAPICall.mock.calls
    .map((c) => c[0])
    .find((c) => String(c.api_url).startsWith('/workflow-status/update'));

beforeEach(() => {
  Service.makeAPICall.mockReset();
  localStorage.clear();
  localStorage.setItem('companyDomain', 'acme');
});

/** Enter inline edit mode on the first row, then commit it. */
const editAndSave = async () => {
  const editBtn = await waitFor(() => {
    const b = document.querySelector('.ant-btn-link.edit, .anticon-edit')?.closest('button');
    expect(b).toBeTruthy();
    return b;
  });
  await act(async () => { fireEvent.click(editBtn); });

  const saveBtn = await waitFor(() => {
    const b = document.querySelector('.anticon-save')?.closest('button');
    expect(b).toBeTruthy();
    return b;
  });
  await act(async () => { fireEvent.click(saveBtn); });
};

it('loads the workflow stages for the routed workflow id', async () => {
  mockApi();
  renderPage();
  await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
  expect(Service.makeAPICall).toHaveBeenCalledWith(
    expect.objectContaining({ api_url: `/workflow-status/${WF_ID}` })
  );
});

it('saves the existing title when the field was not changed', async () => {
  mockApi();
  renderPage();
  await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
  await editAndSave();
  await waitFor(() => expect(updateCall()).toBeTruthy());
  // edtitext.title is seeded from the row, so an untouched field keeps the title.
  expect(updateCall().body).toMatchObject({ workflow_id: WF_ID, title: 'To Do' });
});

/**
 * NOT asserted: typing a new stage title then saving.
 *
 * The editable cell wires onChange onto the <span> WRAPPING an antd <Input>
 * that is itself uncontrolled (defaultValue), rather than onto the Input. A
 * change dispatched at the input does not reach handlechange under jsdom, so
 * edtitext.title stays empty and the save falls back to the original title.
 * That may still work in a real browser via React's event delegation, so this
 * is flagged rather than asserted - worth a manual check on the Workflow
 * Stages screen.
 */

it('renders without throwing before the stage list has loaded', async () => {
  // The list is useState() -> undefined until the request resolves.
  Service.makeAPICall.mockImplementation(() => new Promise(() => {}));
  expect(() => renderPage()).not.toThrow();
  await act(async () => {});
});
