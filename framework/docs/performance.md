# Performance

*Owner: Person A*

The framework makes three performance decisions. Each one is measured by
running the same work with it and without it:

| Decision | Automatic? | Measured in |
|---|---|---|
| 1. Batch updates into one render per frame | yes | demo 1 + tests |
| 2. Keyed list diffing that moves as few elements as possible | yes, when you give `key`s | demo 2 + tests |
| 3. `VirtualList`: only render visible rows | you choose to use it | demo 3 + tests |

All three demos are on one page: run `npm run dev` and open
`/framework/playground/performance.html`. The same measurement code
(`framework/playground/measure.js`) also runs in the test suite
(`/framework/tests/`), so the counts below are checked automatically.

All numbers below are from headless Chromium. Times differ between machines;
compare the ratios and the counts, which do not change.

## 1. Updates are batched into one render per frame

### The decision

`setState` and `store.setState` do not render immediately. They put the
component (or the app) in a queue, and the queue runs once, just before the
browser paints the next frame (`requestAnimationFrame`). The screen can't
show anything in between frames anyway, so rendering more often than that is
wasted work.

```js
store.setState({ loading: true })
store.setState({ filter: 'done' })
store.setState({ page: 2 })
// -> one render, not three
```

Parents are rendered before children, and a child already re-rendered by its
parent is skipped, so nothing renders twice. Use `await nextTick()` when you
need to wait for the DOM to be updated.

### Measured effect

A component with 100 rows calls `setState` 1,000 times in a row. "Without
batching" calls the scheduler's `flush()` after every call, which is what a
framework without batching does: render immediately on every change. Each
mode runs 5 times and the median is shown.

| Mode | `setState` calls | Renders | Time | Final value shown |
|---|---|---|---|---|
| With batching (default) | 1,000 | **1** | ~3–15 ms | Row 0: 1000 |
| Without batching | 1,000 | 1,000 | ~110–170 ms | Row 0: 1000 |

Both modes end with the same result on screen; batching gets there with one
render instead of 1,000, between about 10× and 50× faster depending on the run.
The render count is the stable number: always 1 against 1,000.

## 2. Keyed list diffing

### The decision

Each render produces a new virtual tree. The renderer compares it with the
previous one and only changes what differs, reusing elements instead of
recreating them. For lists, the renderer has two choices for how to match old
and new rows:

- **Without keys** rows are matched by position. Row 3 stays row 3; if the
  data moved, its text is rewritten.
- **With keys** (`h('li', { key: item.id }, …)`) rows are matched by key, so
  each element keeps belonging to the same item and is moved to its new place.

When moving, the renderer finds the **longest run of rows that are already in
the right order** (the "longest increasing subsequence" of their old
positions, the same technique Vue uses) and leaves those in place. Only the
other rows are moved. The code is `patchChildren` and
`longestIncreasingSubsequence` in `src/render.js`.

The first version of the renderer didn't do this. It moved every row whose
next sibling was wrong, so moving one item to the top moved every row:

| Keyed list of 1,000, move last item to the top | Elements moved | Time |
|---|---|---|
| First version | 999 | ~28 ms |
| With longest-run detection | **1** | **~4 ms** |

### Measured effect: keyed vs unkeyed

The demo renders 1,000 rows, each with a checkbox, and ticks every 10th one.
The ticks exist only in the DOM, not in the data, so afterwards they show
whether each element still belongs to the same item. A `MutationObserver`
counts what the renderer did to the DOM. Each case runs 5 times and the
median is shown.

**Move the last item to the top:**

| | Elements created | Elements moved | Text nodes rewritten | Ticks still on the right item | Time |
|---|---|---|---|---|---|
| With keys | 0 | **1** | **0** | **100 / 100** | ~4 ms |
| Without keys | 0 | 0 | 1,000 | 0 / 100 | ~15 ms |

**Reverse the whole list:**

| | Elements created | Elements moved | Text nodes rewritten | Ticks still on the right item | Time |
|---|---|---|---|---|---|
| With keys | 0 | 999 | 0 | **100 / 100** | ~24 ms |
| Without keys | 0 | 0 | 1,000 | 0 / 100 | ~10 ms |

What this shows:

- **No elements are ever recreated**, with or without keys. The diff always
  reuses existing elements.
- **Keys keep the DOM state with the right item.** Without keys, every tick
  ends up on the wrong row, because the elements stay where they were and only
  their text changes. The same would happen to focus, typed input or a
  component's local state.
- **For typical changes keys are also faster.** Moving, inserting or removing
  one item touches one element instead of rewriting every row after it.
- **Reversing an entire list is the one case where keys are slower,** because
  999 moves cost more than rewriting 1,000 short texts. That trade-off is
  worth it for correct state, and full reversals are rare.

Rule: always give list items a stable `key` (an id, not the index).

## 3. `VirtualList`: rendering only what you can see

### The decision

A list of 10,000 rows normally means 10,000 DOM elements: slow to create,
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

### Measured effect

The demo renders the same 10,000 rows both ways and measures the time from
the click until the browser has painted.

| Mode | Time to first paint | Row elements in the DOM |
|---|---|---|
| Plain list | ~170–280 ms | 10,000 |
| VirtualList | ~20 ms | ~18 |

To show the difference in scrolling too, record both lists in DevTools →
Performance and compare the frame rate.

## How to reproduce

1. Run `npm run dev`.
2. Open `http://localhost:3000/framework/playground/performance.html` and
   click the buttons in each section.
3. Open `http://localhost:3000/framework/tests/`. The tests under
   "Performance claims" check the render counts (1 vs 1,000) and the DOM
   counts (moved, created, rewritten, ticks kept) from the tables above.
