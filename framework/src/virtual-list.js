// Owner: Person A
//
// Performance feature: a list that only creates DOM elements for the rows
// you can see (plus a few extra above and below). A list of 10 000 items
// creates about 30 elements instead of 10 000, so it mounts fast and
// scrolls smoothly. See docs/performance.md and playground/performance.html.
//
//   h(VirtualList, {
//     items: bigArray,
//     itemHeight: 32,                  // every row must have the same height (px)
//     height: 400,                     // visible height of the list (px)
//     renderItem: (item, index) => h('span', item.name),
//     getKey: (item) => item.id,       // optional, defaults to the index
//     overscan: 5,                     // optional, extra rows above and below
//   })

import { h } from './vdom.js'
import { defineComponent } from './component.js'

export const VirtualList = defineComponent({
  name: 'VirtualList',

  state: () => ({ scrollTop: 0 }),

  render({ props, state, setState }) {
    const {
      items = [],
      itemHeight,
      height = 400,
      overscan = 5,
      renderItem = (item) => String(item),
      getKey = (_item, index) => index,
      class: className,
    } = props
    if (!itemHeight) throw new Error('VirtualList: "itemHeight" is required')

    const first = Math.max(0, Math.floor(state.scrollTop / itemHeight) - overscan)
    const last = Math.min(items.length, Math.ceil((state.scrollTop + height) / itemHeight) + overscan)

    const rows = []
    for (let i = first; i < last; i++) {
      rows.push(
        h(
          'div',
          {
            key: getKey(items[i], i),
            class: 'vlist-row',
            style: {
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: `${itemHeight}px`,
              transform: `translateY(${i * itemHeight}px)`,
            },
          },
          renderItem(items[i], i),
        ),
      )
    }

    return h(
      'div',
      {
        class: ['vlist', className],
        style: { height: `${height}px`, overflowY: 'auto', position: 'relative' },
        on: { scroll: (_event, el) => setState({ scrollTop: el.scrollTop }) },
      },
      // The spacer has the full height so the scrollbar looks right.
      h('div', { style: { height: `${items.length * itemHeight}px`, position: 'relative' } }, rows),
    )
  },
})
