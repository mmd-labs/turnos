/**
 * Compatibility Shim for App.
 * Delegates directly to the Composition Root in src/main.js.
 */

import { app } from './main.js';

export const App = app;
export default app;
