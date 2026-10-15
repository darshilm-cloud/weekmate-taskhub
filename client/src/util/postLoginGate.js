// Full-screen loader shown right after sign-in until the landing page (dashboard) has its
// first data, so the user never sees the half-built layout (header + skeletons) in between.
let active = false;
let timer = null;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(active));

export const startPostLoginGate = () => {
  active = true;
  clearTimeout(timer);
  timer = setTimeout(endPostLoginGate, 10000); // never trap the user behind the loader
  emit();
};

export const endPostLoginGate = () => {
  if (!active) return;
  active = false;
  clearTimeout(timer);
  emit();
};

export const isPostLoginGateActive = () => active;

export const subscribePostLoginGate = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
