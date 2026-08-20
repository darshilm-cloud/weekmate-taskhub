/**
 * Shared API-data slice: one generic `setData` reducer plus thunks that fetch a
 * list and stash it under a named key. The tests cover the reducer, each
 * thunk's happy path (correct key + endpoint), and the error/empty arms - the
 * thunks swallow failures, so a silent no-dispatch is the contract.
 */
jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    getProjectLables: '/labels',
    getworkflowStatus: '/workflow-status',
    getFolderslist: '/folders',
    getEmployees: '/employees',
    getMasterSubscribers: '/subscribers',
    gettaggedUsersList: '/tagged-users',
    getclient: '/clients',
    getOverview: '/overview',
    makeAPICall: jest.fn(),
  },
}));

import Service from '../../service';
import reducer, {
  setData, getLables, getSpecificProjectWorkflowStage, getFolderList,
  getEmployeeList, getSubscribersList, getTaggedUserList, getClientList,
  getOverviewProjectByID,
} from './ApiData';

const initial = () => reducer(undefined, { type: '@@INIT' });

beforeEach(() => {
  Service.makeAPICall.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('setData reducer', () => {
  it('starts with empty collections', () => {
    expect(initial()).toMatchObject({
      projectLabels: [], foldersList: [], employeeList: [],
      projectWorkflowStage: [], subscribersList: [], clientsList: [], taggedUserList: [],
    });
  });

  it('writes a payload under the named key', () => {
    const s = reducer(initial(), setData({ stateName: 'employeeList', data: [{ _id: 'e1' }] }));
    expect(s.employeeList).toEqual([{ _id: 'e1' }]);
  });

  it('leaves other keys untouched', () => {
    const s = reducer(initial(), setData({ stateName: 'foldersList', data: ['f'] }));
    expect(s.employeeList).toEqual([]);
    expect(s.foldersList).toEqual(['f']);
  });

  it('replaces rather than merges', () => {
    let s = reducer(initial(), setData({ stateName: 'projectLabels', data: ['a', 'b'] }));
    s = reducer(s, setData({ stateName: 'projectLabels', data: ['c'] }));
    expect(s.projectLabels).toEqual(['c']);
  });

  it('ignores an unrelated action', () => {
    const s = initial();
    expect(reducer(s, { type: 'NOPE' })).toEqual(s);
  });
});

/** Run a thunk against a fake dispatch and return the setData payloads it made. */
const run = async (thunk) => {
  const dispatched = [];
  await thunk((a) => dispatched.push(a));
  return dispatched;
};
const resolve = (data) => Service.makeAPICall.mockResolvedValue({ data: { data } });

describe.each([
  ['getLables', () => getLables(), 'projectLabels', '/labels', 'POST'],
  ['getSpecificProjectWorkflowStage', () => getSpecificProjectWorkflowStage('w1'), 'projectWorkflowStage', '/workflow-status/w1', 'GET'],
  ['getFolderList', () => getFolderList('p1'), 'foldersList', '/folders', 'POST'],
  ['getEmployeeList', () => getEmployeeList(), 'employeeList', '/employees', 'GET'],
])('%s', (_name, make, stateName, api_url, methodName) => {
  it(`stores the response under ${stateName}`, async () => {
    resolve([{ _id: 'x' }]);
    const out = await run(make());
    expect(out[0].payload).toEqual({ stateName, data: [{ _id: 'x' }] });
  });

  it(`calls ${methodName} ${api_url}`, async () => {
    resolve([]);
    await run(make());
    expect(Service.makeAPICall).toHaveBeenCalledWith(expect.objectContaining({ methodName, api_url }));
  });

  it('dispatches nothing when the response has no data', async () => {
    Service.makeAPICall.mockResolvedValue({ data: {} });
    expect(await run(make())).toHaveLength(0);
  });

  it('swallows a rejected request without dispatching', async () => {
    Service.makeAPICall.mockRejectedValue(new Error('network'));
    expect(await run(make())).toHaveLength(0);
  });
});

describe('getSubscribersList', () => {
  it('stores the subscribers for a project', async () => {
    resolve([{ _id: 's1' }]);
    const out = await run(getSubscribersList('p1'));
    expect(out[0].payload.stateName).toBe('subscribersList');
  });

  it('passes the project id through to the endpoint', async () => {
    resolve([]);
    await run(getSubscribersList('p1'));
    expect(Service.makeAPICall.mock.calls[0][0].api_url).toContain('p1');
  });
});

describe('getTaggedUserList', () => {
  it('unwraps the nested users array', async () => {
    Service.makeAPICall.mockResolvedValue({ data: { data: [{ users: [{ _id: 'u1' }] }] } });
    const out = await run(getTaggedUserList('t1'));
    expect(out[0].payload).toEqual({ stateName: 'taggedUserList', data: [{ _id: 'u1' }] });
  });

  it('swallows a malformed response rather than throwing', async () => {
    Service.makeAPICall.mockResolvedValue({ data: { data: [] } });
    await expect(run(getTaggedUserList('t1'))).resolves.toBeDefined();
  });
});

describe('getClientList', () => {
  it('stores the client list', async () => {
    resolve([{ _id: 'c1' }]);
    const out = await run(getClientList());
    expect(out.some((a) => a.payload?.stateName === 'clientsList')).toBe(true);
  });

  it('swallows a rejected request', async () => {
    Service.makeAPICall.mockRejectedValue(new Error('network'));
    expect(await run(getClientList('p1'))).toHaveLength(0);
  });
});

describe('getOverviewProjectByID', () => {
  it('stores the overview payload', async () => {
    resolve({ title: 'Acme' });
    const out = await run(getOverviewProjectByID('p1'));
    expect(out[0].payload.stateName).toBe('projectOverviewData');
  });

  it('includes the project id in the request', async () => {
    resolve({});
    await run(getOverviewProjectByID('p9'));
    expect(Service.makeAPICall.mock.calls[0][0].api_url).toContain('p9');
  });
});
