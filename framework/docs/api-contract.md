# API contract

The agreed interfaces between the three parts of the framework. Each person
builds their part against this contract, so nobody has to wait for anyone
else. **Change this file only in a pull request that the other two approve.**

Owners: **A**: rendering, components, app, performance · **B**: events,
state, forms · **C**: routing, HTTP, example app, docs assembly.

Status: ✅ agreed · 🟡 proposed, waiting for confirmation

---

## 1. Elements and components (A) ✅

```js
h(tag, props?, ...children)
h('button', { class: 'btn', style: { color: 'red' }, on: { click: fn } }, 'Save')
h('p', 'props can be skipped')
h(TodoItem, { todo, key: todo.id })
fragment(a, b, c)            // siblings without a wrapper
```

Special props:

| Prop | Meaning |
|---|---|
| `key` | identity inside a list (strings or numbers, unique among siblings) |
| `on` | event listeners, passed unchanged to `events.js` (see 3) |
| `class` | string, array or object: `['btn', { active: isActive }]` |
| `style` | object (`{ backgroundColor: 'red', '--accent': 'blue' }`) or string |
| `ref` | `(el) => {}` or `{ current }`, set on mount, `null` on unmount |
| `value`, `checked`, `selected` | set as **DOM properties**, not attributes |

Components:

```js
const Counter = defineComponent({
  name: 'Counter',
  state: (props) => ({ count: 0 }),     // optional, local state
  render({ props, state, setState, children, store, router }) { return h(...) },
  onMount({ el, ... }) {},              // optional, after DOM is in the page
  onUnmount(ctx) {},                    // optional, before removal
})
const Hello = ({ props }) => h('p', props.name)   // function component, no local state
```

`setState(partial)` or `setState((state, props) => partial)` merges and
re-renders before the next frame. Several calls in a row render once.

## 2. App (A) ✅

```js
const app = createApp({
  root: '#app',            // selector or element
  routes,                  // or: component: App
  store,                   // optional, created if missing
  routerOptions: {},       // optional, passed to createRouter
}).mount()
app.unmount()
nextTick()                 // promise, resolves after pending renders
```

`createApp` calls, in this order: `events.init(rootEl)`, `router.start()`,
mounts the root component, then subscribes to the store. Every store change
schedules **one** re-render of the whole tree before the next frame.

## 3. Events ↔ renderer (B implements, A calls) ✅

```js
// events.js exports
init(rootEl)                    // once, in createApp (and render())
attach(el, on)                  // element with an `on` prop is mounted
update(el, oldOn, newOn)        // every patch of an element that has/had `on`; even if unchanged
detach(el)                      // EVERY element of a removed subtree (also ones without `on`)
```

- Developers write `on: { click: fn, 'submit.prevent': fn, 'click.stop.once': fn }`.
  The renderer passes `on` unchanged; **all modifier parsing is in events.js**.
- Modifiers: `.prevent`, `.stop`, `.once`, `.self`.
- Handler signature: `handler(event, el)`; `el` is the element the handler
  was declared on (with delegation `event.currentTarget` is the root).
- `event.stopPropagation()` inside a handler stops the delegated walk.
- Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`, `scroll`,
  …) are handled inside events.js; the renderer does nothing special.
- Until B's version lands, `events.js` is a stub with the same exports.

## 4. Store (B) ✅

```js
const store = createStore(initialState)
store.getState()
store.setState({ filter: 'done' })                    // shallow merge
store.setState((s) => ({ todos: [...s.todos, t] }))   // function form
const unsubscribe = store.subscribe((state, prevState) => {})
unsubscribe()
```

- No separate `unsubscribe` method: `subscribe` returns it.
- Never mutate state; always create new objects/arrays.
- `setState` notifies subscribers **synchronously**. Batching is the
  renderer's job (2), not the store's.
- Optional extra: `store.select(selector, listener)`.

## 5. Forms (B) ✅

```js
formValues(formEl)          // { title: '...', done: true } via FormData
validate(values, rules)     // { title: 'Required' } or {} when valid
```

Two-way binding needs no helper:
`h('input', { value: state.title, on: { input: (e) => setState({ title: e.target.value }) } })`

## 6. Router (C implements, A calls) 🟡

```js
const router = createRouter({ routes, store, ...options })
router.start()                         // read URL, listen to back/forward
router.stop()
router.navigate('/todo/3')             // push
router.navigate('/', { replace: true })
router.resolve()                       // { component, params, path } | null
```

- `routes`: `{ '/': Home, '/todo/:id': Detail, '*': NotFound }`.
  Matched components receive `props.params`.
- The router writes the reserved store key `route: { path, params, query }`.
  Nothing else writes to `route`. That store change triggers the re-render.
- `RouterView` (in app.js) renders `router.resolve()`; it is the root when
  `createApp({ routes })` is used.
- TODO(C): `Link` component, hash mode, query parsing.

## 7. HTTP (C) 🟡

```js
const { data, error, status } = await http.get('/api/todos')
http.post(url, body) · http.put(url, body) · http.delete(url)
```

- JSON in and out; returns `{ error }` instead of throwing on HTTP errors.
- Data kept in the store always has the shape `{ data, loading, error }`.

## 8. Example app (C) 🟡

- One global store in `example/src/store.js`, passed to `createApp({ store })`.
  Components use `store` from their render context, never import it.
- C shares a sketch of the state shape early so B can test with real data.
