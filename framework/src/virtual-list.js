// Person A
// Only renders the rows in view: 10 000 items -> about 20 elements.
// h(VirtualList, { items, itemHeight, height, renderItem, getKey, overscan })

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
      // Spacer with the full height, for the scrollbar.
      h('div', { style: { height: `${items.length * itemHeight}px`, position: 'relative' } }, rows),
    )
  },
})
