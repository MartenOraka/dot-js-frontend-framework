# The framework

A small front-end framework written from scratch with no dependencies. You
describe your UI with JavaScript (`h()` and components), keep data in a
store, and the framework renders, routes, handles events and updates the page
for you.

```js
import { h, defineComponent, createApp, createStore } from './src/index.js'

const Counter = defineComponent({
  state: () => ({ count: 0 }),
  render: ({ state, setState }) =>
    h('button', { on: { click: () => setState((s) => ({ count: s.count + 1 })) } },
      `Clicked ${state.count} times`),
})

createApp({ root: '#app', component: Counter, store: createStore({}) }).mount()
```

- Documentation: [docs/](./docs/README.md)
- Source: [src/](./src) (public API in `src/index.js`)
- Tests: open `/framework/tests/` with the dev server running
- Playground: `/framework/playground/`

## Source layout

| File | What it does | Owner |
|---|---|---|
| `src/index.js` | public exports | all |
| `src/vdom.js` | `h()`, `fragment()`, virtual nodes | A |
| `src/render.js` | mount, diff/patch, unmount, attributes and styles | A |
| `src/component.js` | `defineComponent`, local state, lifecycle | A |
| `src/scheduler.js` | batching renders per frame, `nextTick` | A |
| `src/app.js` | `createApp`, `RouterView` | A |
| `src/virtual-list.js` | `VirtualList` (performance) | A |
| `src/events.js` | event delegation and modifiers | B (stub for now) |
| `src/store.js` | `createStore` | B (stub for now) |
| `src/forms.js` | `formValues`, `validate` | B (stub for now) |
| `src/router.js` | `createRouter` | C (stub for now) |
| `src/http.js` | `http.get/post/put/delete` | C (stub for now) |
