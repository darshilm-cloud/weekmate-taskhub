/**
 * Root wiring test.
 *
 * Replaces the Create React App scaffold `src/App.test.js`, which imported
 * `./App` and asserted a "learn react" link. Neither ever existed in this
 * repository (`git log --diff-filter=A -- client/src/App.js` is empty, and no
 * source file contains that text), so that suite could never pass; while it
 * failed on import, Jest reported 0% for every file in the app.
 *
 * `NextApp` is the component `src/index.js` actually renders, so mounting it
 * exercises the real Provider / ConnectedRouter / ErrorBoundary wiring.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import NextApp from './NextApp';

describe('NextApp', () => {
  it('mounts the themed application shell', () => {
    const { container } = render(<NextApp />);
    expect(container.querySelector('.app-theme')).not.toBeNull();
  });

  it('renders the unauthenticated entry point rather than the app chrome', () => {
    render(<NextApp />);
    // With no auth token in storage the router must land on the sign-in screen,
    // never on the authenticated sidebar/header shell.
    expect(document.querySelector('.gx-app-login-wrap, .gx-layout, .app-theme')).not.toBeNull();
    expect(screen.queryByText(/learn react/i)).toBeNull();
  });
});
