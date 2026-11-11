# Elements and components

*Owner: Person A*

This page explains how to describe a user interface: creating and nesting
elements, setting attributes and styles, building reusable components, and
starting an application.

## Creating elements with `h()`

You never call `document.createElement` or `getElementById`. Instead you
describe what the page should look like with `h()`, and the framework
creates and updates the real DOM for you.

```js
import { h } from '../framework/src/index.js'

h('div', { class: 'card' },
  h('h2', null, 'Groceries'),
  h('p', 'You can skip props when there are none.'),
)
```

`h(tag, props, ...children)`:

- **tag**: an HTML tag name (`'div'`, `'button'`, `'svg'`) or a component.
- **props**: an object of attributes and special props, or `null`. It can be
  left out entirely: `h('p', 'text')`.
- **children**: strings, numbers, other `h()` calls or arrays of them.
  `null`, `undefined`, `true` and `false` are ignored, so conditions read
  naturally:

```js
h('ul', null,
  todos.map((todo) => h('li', { key: todo.id }, todo.title)),
  todos.length === 0 && h('li', { class: 'empty' }, 'Nothing to do'),
)
```

`h()` does not touch the DOM. It returns a plain object (a *virtual node*).
The framework compares the new tree with the previous one and only changes
what is different.

### Attributes

Any prop that is not special becomes an HTML attribute:

```js
h('a', { href: '/about', title: 'About us', 'data-id': 7 }, 'About')
h('button', { disabled: true }, 'Save')    // true  -> disabled=""
h('button', { disabled: false }, 'Save')   // false -> attribute removed
```

### Classes

`class` accepts a string, an array or an object, and any mix of them:

```js
h('li', { class: 'todo' })
h('li', { class: ['todo', todo.done && 'done'] })
h('li', { class: { todo: true, done: todo.done, editing: isEditing } })
```

### Styles

`style` takes an object with camelCase property names, or CSS custom
properties:

```js
h('div', { style: { backgroundColor: color, marginTop: '1rem', '--progress': `${pct}%` } })
```

When a property disappears from the object it is removed from the element.

### Events

Listeners are given when the element is described, in the `on` prop. You
never call `addEventListener` yourself.

```js
h('button', { on: { click: () => save() } }, 'Save')
h('form', { on: { 'submit.prevent': handleSubmit } }, ...)
```

Every handler receives `(event, el)`. Modifiers such as `.prevent` and
`.stop` are explained in [events.md](./events.md).

### Form inputs

`value`, `checked` and `selected` are set as DOM properties, so the input
always shows what your state says, even after the user has typed:

```js
h('input', {
  value: state.title,
  on: { input: (e) => setState({ title: e.target.value }) },
})
h('input', { type: 'checkbox', checked: todo.done, on: { change: () => toggle(todo.id) } })
h('select', { value: state.sort }, h('option', { value: 'new' }, 'Newest'), h('option', { value: 'old' }, 'Oldest'))
```

See [forms.md](./forms.md) for reading and validating whole forms.

### Lists and keys

When you render a list, give each item a `key` that is unique among its
siblings and stays the same for the same item (an id, not the index):

```js
h('ul', null, todos.map((todo) => h(TodoItem, { key: todo.id, todo })))
```

With keys, reordering or removing an item moves or removes exactly that
DOM node. Components inside the list keep their local state, and inputs keep
their focus. Without keys, items are matched by position.

### Refs: reaching the real element

Sometimes you do need the real element, for example to focus an input.
Pass `ref` a function or an object:

```js
const input = { current: null }
h('input', { ref: input })
// later: input.current.focus()

h('li', { ref: (el) => el && el.scrollIntoView() }, 'Newest message')
```

The ref receives the element after it is created and `null` when it is
removed.

### Fragments

`fragment()` groups siblings without adding a wrapper element. A component
can also return an array, which becomes a fragment.

```js
import { fragment } from '../framework/src/index.js'
fragment(h('dt', term), h('dd', definition))
```

## Components

A component is a reusable piece of UI. Describe it once and use it as many
times as you like with `h(Component, props)`.

### Function components

The simplest component is a function. It receives a context object and
returns what to render:

```js
const Badge = ({ props }) => h('span', { class: ['badge', props.tone] }, props.label)

h(Badge, { label: 'New', tone: 'green' })
```

### Components with state: `defineComponent`

When a component needs its own data (an open/closed toggle, the text being
typed), use `defineComponent`:

```js
import { h, defineComponent } from '../framework/src/index.js'

export const Counter = defineComponent({
  name: 'Counter',
  state: (props) => ({ count: props.start ?? 0 }),
  render({ props, state, setState }) {
    return h('button',
      { on: { click: () => setState((s) => ({ count: s.count + 1 })) } },
      `${props.label}: ${state.count}`)
  },
})

h(Counter, { label: 'Apples' })
h(Counter, { label: 'Pears', start: 10 })
```

| Option | Required | Description |
|---|---|---|
| `render(ctx)` | yes | returns the vnodes to show |
| `state(props)` | no | returns the initial local state |
| `onMount(ctx)` | no | runs once the component's DOM is in the page (`ctx.el` is its first element) |
| `onUnmount(ctx)` | no | runs before the component is removed; clean up timers here |
| `name` | no | shown in error messages |

### The render context

Every render function and hook receives one object:

| Field | Description |
|---|---|
| `props` | what the parent passed in `h(Component, props)` |
| `children` | the children passed: `h(Card, null, h('p', 'inside'))` |
| `state` | this component's local state |
| `setState` | update local state: `setState({ open: true })` or `setState((s, props) => ({ … }))` |
| `store` | the app's global store (see [state.md](./state.md)) |
| `router` | the app's router (see [routing.md](./routing.md)) |
| `el` | the component's first DOM element (in hooks) |

### Updating state

`setState` merges the object you give it into the current state and
re-renders the component. Updates are **batched**: calling `setState` several
times in one event handler renders once, just before the next frame.

When the new state depends on the old state, use the function form. Inside
one event the `state` variable you rendered with does not change, so two
`setState({ count: state.count + 1 })` calls would both write `1`:

```js
setState((state) => ({ count: state.count + 1 }))
```

Use `await nextTick()` if you need to wait until the DOM has been updated.

### Children and composition

```js
const Card = ({ props, children }) =>
  h('section', { class: 'card' }, h('h2', props.title), children)

h(Card, { title: 'Settings' },
  h('p', 'Anything you put here is rendered inside the card.'),
)
```

### Lifecycle example

```js
const Clock = defineComponent({
  state: () => ({ now: new Date(), timer: null }),
  onMount({ setState }) {
    setState({ timer: setInterval(() => setState({ now: new Date() }), 1000) })
  },
  onUnmount({ state }) {
    clearInterval(state.timer)
  },
  render: ({ state }) => h('time', state.now.toLocaleTimeString()),
})
```

Keep per-instance values such as timers in `state`, not in variables outside
the component, so that two clocks on one page each have their own timer.

## Starting an application: `createApp`

`createApp` is where the framework takes control. You describe the app and
call `mount()`; from then on the framework decides when to render.

```js
import { createApp, createStore } from '../framework/src/index.js'
import { routes } from './routes.js'

const store = createStore({ todos: [] })
createApp({ root: '#app', routes, store }).mount()
```

| Option | Description |
|---|---|
| `root` | CSS selector or element the app is rendered into (its contents are replaced) |
| `routes` | route table, see [routing.md](./routing.md); the matching page is rendered |
| `component` | a root component, if you don't use routes |
| `store` | the global store; one is created when left out |
| `routerOptions` | extra options for the router |

What happens on `mount()`:

1. The event system is set up on the root element.
2. The router reads the current URL.
3. The root component (or the page that matches the URL) is rendered.
4. The app subscribes to the store. **Any** store change, including a route
   change, re-renders the app once before the next frame. Unchanged parts
   of the page are not touched in the DOM.

`app.unmount()` removes everything and stops listening.

### Without createApp: `render()`

For small widgets or tests you can render straight into an element.
Calling `render` again with a new tree updates the previous one.

```js
import { h, render } from '../framework/src/index.js'
render(h('p', 'Hello'), document.querySelector('#widget'))
```
