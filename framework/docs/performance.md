# Performance

*Owner: Person A*

The framework includes three things that make it faster than writing to the
DOM naively. You get the first two automatically; the third is a component
you choose to use.

## 1. Only changed parts of the DOM are touched

Each render produces a new virtual tree. The renderer compares it with the
previous tree and only updates what differs: one changed text node, one
changed class. Elements are reused, not recreated.

In lists, `key` lets the renderer move existing elements when items are
reordered, instead of rebuilding every row. Always give list items a stable
key.

## 2. Updates are batched into one render per frame

`setState` and `store.setState` do not render immediately. They put the
component (or the app) in a queue, and the queue runs once, just before the
browser paints the next frame (`requestAnimationFrame`).

```js
store.setState({ loading: true })
store.setState({ filter: 'done' })
store.setState({ page: 2 })
// -> one render, not three
```

Parents are rendered before children, and a child already re-rendered by its
parent is skipped, so nothing renders twice.

Use `await nextTick()` when you need to wait for the DOM to be updated.

## 3. `VirtualList`: rendering only what you can see

A list of 10 000 rows normally means 10 000 DOM elements: slow to create,
heavy in memory, and slow to scroll. `VirtualList` only creates the rows
that are visible, plus a few extra above and below, and swaps them while you
scroll. A spacer element keeps the scrollbar the right size.

```js
import { h, VirtualList } from '../framework/src/index.js'

h(VirtualList, {
  items: products,                   // any array
  itemHeight: 32,                    // px; every row must be this tall
  height: 400,                       // px; visible height of the list
  renderItem: (product, index) => h('span', product.name),
  getKey: (product) => product.id,   // optional, default: index
  overscan: 5,                       // optional, extra rows above/below
  class: 'product-list',             // optional
})
```

Limitations: rows must all have the same height, and the list scrolls inside
its own box (it has a fixed `height`).

### Measured result

Open `/framework/playground/performance.html` (run `npm run dev` first). It
renders the same 10 000 rows both ways and measures the time from the click
until the browser has painted. In headless Chromium:

| Mode | Time to first paint | Row elements in the DOM |
|---|---|---|
| Plain list | ~280 ms | 10 000 |
| VirtualList | ~20 ms | ~18 |

Your numbers will differ by machine; the ratio is what matters. To show the
difference in scrolling too, record both lists in DevTools → Performance and
compare the frame rate.
