/**
 * Mount coverage for ResourceMatrix.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './ResourceMatrix';

mountSmoke('ResourceMatrix', Component, {
  Service,
  route: '/acme/resource-matrix',
  path: '/:companySlug/resource-matrix',
});
