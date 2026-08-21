/**
 * Mount coverage for FileModule.
 * See testUtils/mountSmoke for what this baseline asserts and why.
 */
jest.mock('../../service', () => require('../../testUtils/serviceMock')());
jest.mock('../../cacheDB', () => ({
  __esModule: true,
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  clearCachedData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@ckeditor/ckeditor5-react', () => ({ __esModule: true, CKEditor: () => null }));
jest.mock('ckeditor5-custom-build/build/ckeditor', () => ({ __esModule: true, default: {} }));
jest.mock('react-apexcharts', () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import { mountSmoke } from '../../testUtils/mountSmoke';
// eslint-disable-next-line import/first
import Component from './FileModule';

mountSmoke('FileModule', Component, {
  Service,
  route: '/acme/project/p1/view',
  path: '/:companySlug/project/:projectId/view',
});
