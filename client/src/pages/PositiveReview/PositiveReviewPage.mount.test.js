/**
 * Mount coverage for the PositiveReview page.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());
jest.mock('react-apexcharts', () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './index';

mountSmoke('PositiveReview', Component, {
  Service,
  route: '/acme/positive-review',
  path: '/:companySlug/positive-review',
});
