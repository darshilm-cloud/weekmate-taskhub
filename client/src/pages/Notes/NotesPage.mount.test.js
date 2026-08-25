/**
 * Mount coverage for NotesPage.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());
jest.mock('@ckeditor/ckeditor5-react', () => ({ __esModule: true, CKEditor: () => null }));
jest.mock('ckeditor5-custom-build/build/ckeditor', () => ({ __esModule: true, default: {} }));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './index';

mountSmoke('NotesPage', Component, {
  Service,
  route: '/acme/project/p1/notes',
  path: '/:companySlug/project/:projectId/notes',
});
