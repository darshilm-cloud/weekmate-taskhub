/**
 * Mount coverage for UserDashboard.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());
jest.mock('react-apexcharts', () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './UserDashboard';

mountSmoke('UserDashboard', Component, {
  Service,
  route: '/acme/employees',
  path: '/:companySlug/employees',
  props: { user: { _id: 'u1', full_name: 'Test User' } },
});
