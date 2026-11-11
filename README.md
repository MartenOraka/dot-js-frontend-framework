# dot-js: front-end framework

Our own front-end framework, built from scratch without React, Vue, Angular
or any other library, plus an example app that uses every feature.

```
framework/   the framework (src/) and its documentation (docs/)
example/     the example app built with the framework, and the dev server
```

## Running it

Requires Node.js 18 or newer. There are no dependencies to install.

```bash
npm run dev
```

Then open:

- http://localhost:3000/ for the example app
- http://localhost:3000/framework/tests/ for the test runner
- http://localhost:3000/framework/playground/ for demo pages (e.g. the performance demo)

Use a different port with `PORT=4000 npm run dev`.

## Features

| Requirement | Where |
|---|---|
| DOM abstraction: create and nest elements, attributes, styles | `h()`, see [dom-and-components.md](framework/docs/dom-and-components.md) |
| Reusable components | `defineComponent`, function components |
| State management | `createStore` and component state, see [state.md](framework/docs/state.md) |
| Routing | `createRouter`, `routes` in `createApp`, see [routing.md](framework/docs/routing.md) |
| Event handling, delegation, prevent/stop | `on` prop, see [events.md](framework/docs/events.md) |
| Forms and user input | see [forms.md](framework/docs/forms.md) |
| HTTP (extra) | `http`, see [http.md](framework/docs/http.md) |
| Performance (extra) | batched rendering, keyed diffing, `VirtualList`, see [performance.md](framework/docs/performance.md) |

## Team

| Person | Owns |
|---|---|
| A | rendering (virtual DOM, diff/patch), components, `createApp`, scheduler, `VirtualList` |
| B | events (delegation, modifiers), store, forms |
| C | router, HTTP, example app, README and documentation assembly |

The interfaces between the parts are in
[framework/docs/api-contract.md](framework/docs/api-contract.md). Change it
only in a pull request the other two approve.

## Status

- Done (A): virtual DOM, renderer, components, `createApp`, batching, `VirtualList`, tests, docs for those parts
- Stubs (work, but are minimal placeholders): `events.js`, `store.js` (B), `router.js` (C)
- Not started: `forms.js` (B), `http.js` (C), the real example app (C), docs pages for B and C

## Ideas the reviewer can add

- A: a `show` prop that hides an element without removing it; an `onUpdate` lifecycle hook
- B: an `.enter` key modifier; a store that saves to `localStorage`
- C: route guards (e.g. redirect when not logged in); a loading spinner while a request runs
