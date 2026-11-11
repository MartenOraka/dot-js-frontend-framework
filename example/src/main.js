// Owner: Person C
// Entry point of the example app. This is a placeholder that proves the
// framework boots; Person C replaces the pages with the real app.

import { createApp } from '/framework/src/index.js'
import { store } from './store.js'
import { routes } from './routes.js'

const app = createApp({ root: '#app', routes, store }).mount()

// Exposed for debugging in the browser console.
window.app = app
