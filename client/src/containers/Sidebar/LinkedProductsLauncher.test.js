/**
 * Behaviour tests for the connected-products launcher.
 *
 * Covers the branches Sonar flags as uncovered new code: the fetch success /
 * error / non-array paths, the "render nothing when empty" guard, refetch on
 * popover open, the logo lookup and its normalisation, and the three link
 * states (query-string join, bare join, and no signin_url at all).
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    linkedProducts: '/linked-products',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../../service';
// eslint-disable-next-line import/first
import LinkedProductsLauncher from './LinkedProductsLauncher';
// eslint-disable-next-line import/first
import { setSharedSso } from '../../util/ssoCookie';

const resolveWith = (data) => Service.makeAPICall.mockResolvedValue({ data: { data } });

const clearCookies = () => {
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
    .forEach((n) => {
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

beforeEach(() => {
  Service.makeAPICall.mockReset();
  clearCookies();
  localStorage.clear();
});

const openLauncher = async () => {
  const btn = await screen.findByLabelText('Connected products');
  fireEvent.click(btn);
  return btn;
};

describe('fetching the connected-product list', () => {
  it('requests the linked-products endpoint with a GET on mount', async () => {
    resolveWith([]);
    render(<LinkedProductsLauncher />);
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalledTimes(1));
    expect(Service.makeAPICall).toHaveBeenCalledWith({
      methodName: 'GET',
      api_url: '/linked-products',
    });
  });

  it('renders no launcher button at all when the company has no connected products', async () => {
    resolveWith([]);
    const { container } = render(<LinkedProductsLauncher />);
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the request rejects, rather than surfacing the error', async () => {
    Service.makeAPICall.mockRejectedValue(new Error('502 upstream'));
    const { container } = render(<LinkedProductsLauncher />);
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['null payload', null],
    ['an object instead of an array', { product_name: 'HRMS' }],
    ['a string', 'HRMS'],
    ['a missing data envelope', undefined],
  ])('treats %s as an empty list', async (_label, payload) => {
    Service.makeAPICall.mockResolvedValue({ data: { data: payload } });
    const { container } = render(<LinkedProductsLauncher />);
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the launcher once at least one product comes back', async () => {
    resolveWith([{ product_name: 'HRMS', product_slug: 'hrms', signin_url: 'https://hrms.weekmate.in/signin' }]);
    render(<LinkedProductsLauncher />);
    expect(await screen.findByLabelText('Connected products')).toBeInTheDocument();
  });

  it('refetches when the popover is opened, so a newly linked product appears', async () => {
    resolveWith([{ product_name: 'HRMS', signin_url: 'https://hrms.weekmate.in/signin' }]);
    render(<LinkedProductsLauncher />);
    await openLauncher();
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalledTimes(2));
  });
});

describe('product tiles', () => {
  const renderOpen = async (list) => {
    resolveWith(list);
    render(<LinkedProductsLauncher />);
    await openLauncher();
    await screen.findByText('Connected products');
  };

  it('appends the SSO token to a plain signin_url with a ?', async () => {
    setSharedSso('tok en/+value');
    await renderOpen([{ product_name: 'HRMS', signin_url: 'https://hrms.weekmate.in/signin' }]);
    const link = await screen.findByRole('link', { name: /HRMS/ });
    expect(link).toHaveAttribute(
      'href',
      `https://hrms.weekmate.in/signin?token=${encodeURIComponent('tok en/+value')}`
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('joins with & when signin_url already carries a query string', async () => {
    setSharedSso('abc');
    await renderOpen([{ product_name: 'CRM', signin_url: 'https://crm.weekmate.in/signin?next=%2Fhome' }]);
    const link = await screen.findByRole('link', { name: /CRM/ });
    expect(link).toHaveAttribute('href', 'https://crm.weekmate.in/signin?next=%2Fhome&token=abc');
  });

  it('sends an empty token when no shared SSO cookie exists', async () => {
    await renderOpen([{ product_name: 'CRM', signin_url: 'https://crm.weekmate.in/signin' }]);
    const link = await screen.findByRole('link', { name: /CRM/ });
    expect(link).toHaveAttribute('href', 'https://crm.weekmate.in/signin?token=');
  });

  it('renders a non-clickable tile when the product has no signin_url', async () => {
    await renderOpen([{ product_name: 'Payroll' }]);
    expect(await screen.findByText('Payroll')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Payroll/ })).toBeNull();
  });

  it('falls back from product_name to product_slug, then to "Product"', async () => {
    await renderOpen([
      { product_slug: 'econnect', signin_url: 'https://e.weekmate.in/signin' },
      { signin_url: 'https://x.weekmate.in/signin' },
    ]);
    expect(await screen.findByText('econnect')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  it('renders every connected product', async () => {
    await renderOpen([
      { product_name: 'HRMS', signin_url: 'https://a/signin' },
      { product_name: 'CRM', signin_url: 'https://b/signin' },
      { product_name: 'Payroll', signin_url: 'https://c/signin' },
    ]);
    expect(await screen.findByText('HRMS')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
  });
});

describe('logo resolution', () => {
  // antd renders Popover content into a portal on document.body, NOT inside the
  // component's own container, so these queries must go through the document.
  const productLogos = () => document.querySelectorAll('img[alt=""]');

  const renderOpenWith = async (product_name, extra = {}) => {
    resolveWith([{ product_name, signin_url: 'https://x/signin', ...extra }]);
    render(<LinkedProductsLauncher />);
    await openLauncher();
    await screen.findByText('Connected products');
  };

  it.each(['HRMS', 'hrms', 'E-HRMS', 'eHRMS', 'CRM', 'e-crm', 'TaskHub', 'task hub', 'Econnect', 'Payroll', 'PMS'])(
    'resolves a bundled logo for %s',
    async (name) => {
      await renderOpenWith(name);
      await waitFor(() => expect(productLogos().length).toBe(1));
    }
  );

  it.each(['  Task Hub  ', 'E-Task Hub'])('normalises whitespace and casing in %s', async (name) => {
    await renderOpenWith(name);
    await waitFor(() => expect(productLogos().length).toBe(1));
  });

  it('falls back to the generic icon for an unrecognised product name', async () => {
    await renderOpenWith('Warehouse');
    await screen.findByText('Warehouse');
    expect(productLogos().length).toBe(0);
    expect(document.querySelector('.anticon-appstore')).not.toBeNull();
  });

  it('falls back to the generic icon when the name is not a usable string', async () => {
    await renderOpenWith(12345, { product_slug: 12345 });
    await waitFor(() => expect(document.querySelector('.anticon-appstore')).not.toBeNull());
    expect(productLogos().length).toBe(0);
  });
});
