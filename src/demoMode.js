// Vite dev server keeps fixtures; release builds exclude them unless explicitly requested.
// Node-only unit tests run against fixtures without a Vite environment.
export const DEMO_MODE = import.meta.env ? import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true' : true;
