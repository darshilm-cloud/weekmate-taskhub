/**
 * Mount coverage for ProjectStatus.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './ProjectStatus';

mountSmoke('ProjectStatus', Component, {
  Service,
  route: '/acme/project-status',
  path: '/:companySlug/project-status',
});
