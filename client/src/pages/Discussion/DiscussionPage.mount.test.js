/**
 * Mount coverage for DiscussionPage.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './index';

mountSmoke('DiscussionPage', Component, {
  Service,
  route: '/acme/project/p1/discussion',
  path: '/:companySlug/project/:projectId/discussion',
});
