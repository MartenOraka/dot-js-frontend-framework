// Public entry point. Applications import everything from here:
//
//   import { h, defineComponent, createApp, createStore } from '../framework/src/index.js'
//
// Owners: see the header of each file and docs/api-contract.md.

// Person A: rendering, components, app, performance
export { h, fragment, text } from './vdom.js'
export { render } from './render.js'
export { defineComponent } from './component.js'
export { createApp, RouterView } from './app.js'
export { nextTick } from './scheduler.js'
export { VirtualList } from './virtual-list.js'

// Person B: events, state, forms
export * as events from './events.js'
export { createStore } from './store.js'
export { formValues, validate } from './forms.js'

// Person C: routing, HTTP
export { createRouter } from './router.js'
export { http } from './http.js'
