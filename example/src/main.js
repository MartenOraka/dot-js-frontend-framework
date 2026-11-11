// Person C: example app entry (placeholder).

import { createApp } from '/framework/src/index.js'
import { store } from './store.js'
import { routes } from './routes.js'

const app = createApp({ root: '#app', routes, store }).mount()

// For debugging in the console.
window.app = app
