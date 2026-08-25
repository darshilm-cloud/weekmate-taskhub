/**
 * Mount coverage for BugWorkflowStages.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './index';

mountSmoke('BugWorkflowStages', Component, {
  Service,
  route: '/acme/bug-workflow-stages',
  path: '/:companySlug/bug-workflow-stages',
});
