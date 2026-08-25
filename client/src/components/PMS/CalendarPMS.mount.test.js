/**
 * Mount coverage for CalendarPMS.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './CalendarPMS';

// Regression: moment was used (the month-year header, and a date display) but
// never imported - "ReferenceError: moment is not defined" on every render,
// since antd's Calendar calls headerRender unconditionally on mount. The page
// was completely broken - a hard crash, not a degraded state. mountSmoke's
// "mounts without crashing" below is the regression test: it failed with
// that ReferenceError before the fix.
mountSmoke('CalendarPMS', Component, {
  Service,
  route: '/acme/calendar',
  path: '/:companySlug/calendar',
});
