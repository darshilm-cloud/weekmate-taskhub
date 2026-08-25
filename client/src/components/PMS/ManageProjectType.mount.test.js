/**
 * Mount coverage for ManageProjectType.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './ManageProjectType';

mountSmoke('ManageProjectType', Component, {
  Service,
  route: '/acme/project-types',
  path: '/:companySlug/project-types',
});
