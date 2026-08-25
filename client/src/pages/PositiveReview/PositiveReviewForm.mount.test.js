/**
 * Mount coverage for PositiveReviewForm.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './PositiveReviewForm';

mountSmoke('PositiveReviewForm', Component, {
  Service,
  route: '/acme/positive-review/form',
  path: '/:companySlug/positive-review/form',
});
