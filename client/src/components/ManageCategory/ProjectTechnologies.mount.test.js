/**
 * Mount coverage for ProjectTechnologies.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './ProjectTechnologies';

mountSmoke('ProjectTechnologies', Component, {
  Service,
  route: '/acme/project-technologies',
  path: '/:companySlug/project-technologies',
});
