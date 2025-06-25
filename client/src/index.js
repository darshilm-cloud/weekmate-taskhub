import React from "react";
import { createRoot } from "react-dom/client";

import NextApp from './NextApp';
import registerServiceWorker from './registerServiceWorker';


// Function to hide console logs in production mode
const disableConsoleInProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.debug = noop;
  }
};

// Disable console logs in production mode
disableConsoleInProduction();

// Wrap the rendering in a function:
const render = Component => {
  // Use createRoot to manage the root of your app
  const root = createRoot(document.getElementById('root')); // Create a root.
  root.render(<Component />); // Initial render
};

// Do this once
registerServiceWorker();

// Render once
render(NextApp);


