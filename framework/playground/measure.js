// Person A: measurements

import { h, render, defineComponent, nextTick } from '../src/index.js'
import { flush } from '../src/scheduler.js'

// Batching
export async function measureBatching({ container, batched, calls = 1000, rows = 100 }) {
  render(null, container)
  let renders = 0
  let setCount = null

  const Target = defineComponent({
    name: 'BatchTarget',
    state: () => ({ count: 0 }),
    onMount: ({ setState }) => (setCount = setState),
    render({ state }) {
      renders++
      return h('ul', Array.from({ length: rows }, (_, i) => h('li', { key: i }, `Row ${i}: ${state.count}`)))
    },
  })

  render(h(Target), container)
  container.offsetHeight
  renders = 0

  const start = performance.now()
  for (let i = 0; i < calls; i++) {
    setCount((s) => ({ count: s.count + 1 }))
    if (!batched) flush()
  }
  if (batched) flush()
  container.offsetHeight
  const ms = performance.now() - start
  await nextTick()

  return { calls, renders, ms, shown: container.querySelector('li').textContent }
}

// Keyed vs unkeyed
export function measureReorder({ container, keyed, operation, size = 1000 }) {
  render(null, container)
  const items = Array.from({ length: size }, (_, i) => ({ id: i, label: `Item ${i}` }))
  const view = (list) =>
    h('ul', list.map((item) =>
      h('li', keyed ? { key: item.id } : null, h('input', { type: 'checkbox' }), ` ${item.label}`)))

  render(view(items), container)
  const ul = container.querySelector('ul')
  const original = new Set(ul.children)
  const ticked = new Set()
  items.forEach((item, i) => {
    if (i % 10 === 0) {
      ul.children[i].querySelector('input').checked = true
      ticked.add(item.label)
    }
  })

  const next =
    operation === 'reverse' ? [...items].reverse() : [items[size - 1], ...items.slice(0, -1)]

  ul.offsetHeight
  const observer = new MutationObserver(() => {})
  observer.observe(ul, { childList: true, subtree: true, characterData: true })
  const start = performance.now()
  render(view(next), container)
  ul.offsetHeight
  const ms = performance.now() - start
  const records = observer.takeRecords()
  observer.disconnect()

  const created = new Set()
  const moved = new Set()
  const textChanged = new Set()
  for (const record of records) {
    if (record.type === 'characterData') textChanged.add(record.target)
    for (const node of record.addedNodes) {
      if (node.nodeName === 'LI') (original.has(node) ? moved : created).add(node)
      else if (node.nodeType === Node.TEXT_NODE) textChanged.add(node)
    }
  }

  let ticksKept = 0
  for (const li of ul.children) {
    if (li.querySelector('input').checked && ticked.has(li.textContent.trim())) ticksKept++
  }

  const order = [...ul.children].map((li) => li.textContent.trim())
  const correct = order.every((label, i) => label === next[i].label)

  return {
    created: created.size,
    moved: moved.size,
    textChanged: textChanged.size,
    ticksKept,
    ticked: ticked.size,
    ms,
    correct,
  }
}
