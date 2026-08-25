/**
 * Mount coverage for WorkflowStagesEdit.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './WorkflowStagesEdit';

mountSmoke('WorkflowStagesEdit', Component, {
  Service,
  route: '/acme/workflow-stages/edit/wf1',
  path: '/:companySlug/workflow-stages/edit/:id',
});
