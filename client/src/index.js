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

// Ignore noisy browser ResizeObserver loop errors triggered by rich editors/modals.
// These are harmless in our app but CRA's overlay treats them like fatal runtime errors.
const suppressBenignResizeObserverErrors = () => {
  if (typeof window === "undefined") return;

  const isResizeObserverMessage = (message = "") =>
    typeof message === "string" &&
    (message.includes("ResizeObserver loop completed with undelivered notifications") ||
      message.includes("ResizeObserver loop limit exceeded"));

  window.addEventListener("error", (event) => {
    if (!isResizeObserverMessage(event?.message)) return;
    event.stopImmediatePropagation();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reasonMessage =
      event?.reason?.message ||
      (typeof event?.reason === "string" ? event.reason : "");
    if (!isResizeObserverMessage(reasonMessage)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  });
};

suppressBenignResizeObserverErrors();

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

