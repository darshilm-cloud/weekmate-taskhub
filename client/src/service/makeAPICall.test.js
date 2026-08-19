/**
 * Service.makeAPICall permission-check guard.
 *
 * A GET response normally goes through permissionRoleChange, which force-logs-out
 * when the user's permissions look changed. Two endpoints must be exempt because
 * their responses do not carry permissions at all: getCompanyDetails and the
 * cross-product linked-products proxy. Without the exemption the "Connected
 * products" button never rendered - a 200 response was read as a role change and
 * redirected to /signin.
 */
import axios from 'axios';
import Service from './index';

jest.mock('axios');

beforeEach(() => {
  jest.restoreAllMocks();
  axios.get = jest.fn().mockResolvedValue({ status: 200, data: { data: [] } });
  axios.interceptors = {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  };
  localStorage.clear();
});

const callGet = (api_url) =>
  Service.makeAPICall({ methodName: Service.getMethod, api_url });

it('skips the permission check for the linked-products proxy', async () => {
  const spy = jest.spyOn(Service, 'permissionRoleChange').mockImplementation(() => {});
  await callGet(Service.linkedProducts);
  expect(axios.get).toHaveBeenCalled();
  expect(spy).not.toHaveBeenCalled();
});

it('skips the permission check for getCompanyDetails', async () => {
  const spy = jest.spyOn(Service, 'permissionRoleChange').mockImplementation(() => {});
  await callGet(Service.getCompanyDetails);
  expect(spy).not.toHaveBeenCalled();
});

it('still runs the permission check for an ordinary GET endpoint', async () => {
  const spy = jest.spyOn(Service, 'permissionRoleChange').mockImplementation(() => {});
  await callGet('/some/other/endpoint');
  expect(spy).toHaveBeenCalledTimes(1);
});

it('returns the axios response to the caller', async () => {
  jest.spyOn(Service, 'permissionRoleChange').mockImplementation(() => {});
  const res = await callGet(Service.linkedProducts);
  expect(res).toMatchObject({ status: 200 });
});

it('returns the error response instead of throwing when the request fails', async () => {
  jest.spyOn(Service, 'permissionRoleChange').mockImplementation(() => {});
  axios.get = jest.fn().mockRejectedValue({ response: { status: 500, data: { message: 'boom' } } });
  const res = await callGet('/some/other/endpoint');
  expect(res).toMatchObject({ status: 500 });
});
