// Owner: Person A. Tests for vdom.js, render.js, component.js, app.js,
// scheduler.js and virtual-list.js.

import { test, assert, assertEqual, sandbox } from './harness.js'
import {
  h, fragment, render, defineComponent, createApp, createStore, nextTick, VirtualList,
} from '../src/index.js'

// --- h() and mounting -------------------------------------------------------

test('h() creates elements, text and nested children', () => {
  const root = sandbox()
  render(h('div', { id: 'a' }, 'Hello ', h('b', null, 'world'), 42), root)
  assertEqual(root.innerHTML, '<div id="a">Hello <b>world</b>42</div>')
})

test('props can be skipped and null/false children are ignored', () => {
  const root = sandbox()
  render(h('ul', [h('li', 'one'), null, false, [h('li', 'two')]]), root)
  assertEqual(root.innerHTML, '<ul><li>one</li><li>two</li></ul>')
})

test('class accepts string, array and object', () => {
  const root = sandbox()
  render(h('p', { class: ['a', false && 'x', { b: true, c: false }] }), root)
  assertEqual(root.firstChild.className, 'a b')
})

test('style object is applied and patched', () => {
  const root = sandbox()
  render(h('p', { style: { color: 'red', marginTop: '4px', '--accent': 'blue' } }), root)
  const p = root.firstChild
  assertEqual(p.style.color, 'red')
  assertEqual(p.style.marginTop, '4px')
  assertEqual(p.style.getPropertyValue('--accent'), 'blue')
  render(h('p', { style: { color: 'green' } }), root)
  assertEqual(p.style.color, 'green')
  assertEqual(p.style.marginTop, '')
})

test('boolean attributes and attribute removal', () => {
  const root = sandbox()
  render(h('button', { disabled: true, title: 'x' }), root)
  const btn = root.firstChild
  assert(btn.disabled, 'should be disabled')
  render(h('button', { disabled: false }), root)
  assert(!btn.disabled, 'should be enabled')
  assert(!btn.hasAttribute('title'), 'title should be removed')
})

test('value and checked are DOM properties', () => {
  const root = sandbox()
  render(h('input', { value: 'a' }), root)
  const input = root.firstChild
  input.value = 'typed by user'
  render(h('input', { value: 'b' }), root)
  assertEqual(input.value, 'b')
  render(h('input', { type: 'checkbox', checked: true }), root)
  // type changed attribute only; same element is reused
  assert(root.firstChild.checked, 'should be checked')
})

test('select value works with options', () => {
  const root = sandbox()
  render(h('select', { value: 'b' }, h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B')), root)
  assertEqual(root.firstChild.value, 'b')
})

test('svg elements get the svg namespace', () => {
  const root = sandbox()
  render(h('svg', { width: 10 }, h('circle', { r: 5 })), root)
  assertEqual(root.querySelector('circle').namespaceURI, 'http://www.w3.org/2000/svg')
})

test('ref receives the element and null on unmount', () => {
  const root = sandbox()
  const ref = { current: undefined }
  render(h('div', null, h('input', { ref })), root)
  assertEqual(ref.current.tagName, 'INPUT')
  render(h('div'), root)
  assertEqual(ref.current, null)
})

// --- events (through events.js) ----------------------------------------------

test('on: listeners are attached, updated and removed', () => {
  const root = sandbox()
  const calls = []
  render(h('button', { on: { click: (e, el) => calls.push(['first', el.tagName]) } }), root)
  const btn = root.firstChild
  btn.click()
  render(h('button', { on: { click: () => calls.push(['second']) } }), root)
  btn.click()
  render(h('button'), root)
  btn.click()
  assertEqual(calls, [['first', 'BUTTON'], ['second']])
})

test('.prevent modifier prevents default', () => {
  const root = sandbox()
  let prevented = null
  render(h('form', { on: { 'submit.prevent': (e) => (prevented = e.defaultPrevented) } }), root)
  root.firstChild.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  assertEqual(prevented, true)
})

// --- patching -------------------------------------------------------------------

test('patch reuses elements and updates text', () => {
  const root = sandbox()
  render(h('p', null, 'a'), root)
  const p = root.firstChild
  render(h('p', null, 'b'), root)
  assert(root.firstChild === p, 'element should be reused')
  assertEqual(p.textContent, 'b')
})

test('patch replaces node when tag changes', () => {
  const root = sandbox()
  render(h('div', null, h('p', 'x')), root)
  render(h('div', null, h('span', 'y')), root)
  assertEqual(root.innerHTML, '<div><span>y</span></div>')
})

test('keyed lists move existing DOM nodes instead of recreating them', () => {
  const root = sandbox()
  const list = (ids) => h('ul', ids.map((id) => h('li', { key: id }, id)))
  render(list(['a', 'b', 'c', 'd']), root)
  const before = {}
  root.querySelectorAll('li').forEach((li) => (before[li.textContent] = li))
  render(list(['d', 'b', 'e', 'a']), root)
  const items = [...root.querySelectorAll('li')]
  assertEqual(items.map((li) => li.textContent), ['d', 'b', 'e', 'a'])
  assert(items[0] === before.d && items[1] === before.b && items[3] === before.a, 'nodes reused')
})

test('unkeyed lists grow and shrink', () => {
  const root = sandbox()
  render(h('ul', [1, 2].map((n) => h('li', n))), root)
  render(h('ul', [1, 2, 3, 4].map((n) => h('li', n))), root)
  assertEqual(root.querySelectorAll('li').length, 4)
  render(h('ul', [1].map((n) => h('li', n))), root)
  assertEqual(root.innerHTML, '<ul><li>1</li></ul>')
})

test('fragments render siblings without a wrapper and patch correctly', () => {
  const root = sandbox()
  render(h('div', null, h('i', 'start'), fragment(h('b', '1'), h('b', '2')), h('i', 'end')), root)
  assertEqual(root.firstChild.innerHTML, '<i>start</i><b>1</b><b>2</b><i>end</i>')
  render(h('div', null, h('i', 'start'), fragment(h('b', '1'), h('b', '2'), h('b', '3')), h('i', 'end')), root)
  assertEqual(root.firstChild.innerHTML, '<i>start</i><b>1</b><b>2</b><b>3</b><i>end</i>')
})

// --- components ------------------------------------------------------------------

const Counter = defineComponent({
  name: 'Counter',
  state: (props) => ({ count: props.start || 0 }),
  render({ props, state, setState }) {
    // Function form: two clicks before the next render must both count.
    return h('button', { on: { click: () => setState((s) => ({ count: s.count + 1 })) } }, `${props.label}:${state.count}`)
  },
})

test('components render with props and local state; updates are batched', async () => {
  const root = sandbox()
  render(h('div', null, h(Counter, { label: 'a' }), h(Counter, { label: 'b', start: 5 })), root)
  assertEqual(root.textContent, 'a:0b:5')
  const [a] = root.querySelectorAll('button')
  a.click()
  a.click()
  assertEqual(root.textContent, 'a:0b:5', 'not rendered synchronously')
  await nextTick()
  assertEqual(root.textContent, 'a:2b:5')
})

test('component keeps its state when the parent re-renders with new props', async () => {
  const root = sandbox()
  render(h(Counter, { label: 'x' }), root)
  root.querySelector('button').click()
  await nextTick()
  render(h(Counter, { label: 'y' }), root)
  assertEqual(root.textContent, 'y:1')
})

test('function components and children', () => {
  const root = sandbox()
  const Card = ({ props, children }) => h('section', { class: 'card' }, h('h2', props.title), children)
  render(h(Card, { title: 'T' }, h('p', 'body')), root)
  assertEqual(root.innerHTML, '<section class="card"><h2>T</h2><p>body</p></section>')
})

test('components may return null, strings or arrays', () => {
  const root = sandbox()
  const Nothing = () => null
  const Many = () => [h('i', '1'), 'two']
  render(h('div', null, h(Nothing), h(Many)), root)
  assertEqual(root.firstChild.innerHTML, '<i>1</i>two')
})

test('onMount runs after insertion, onUnmount before removal', async () => {
  const root = sandbox()
  const log = []
  const Child = defineComponent({
    render: () => h('span', 'c'),
    onMount: ({ el }) => log.push(`mount:${el.isConnected}`),
    onUnmount: ({ el }) => log.push(`unmount:${el.isConnected}`),
  })
  render(h('div', null, h(Child)), root)
  render(h('div'), root)
  assertEqual(log, ['mount:true', 'unmount:true'])
})

test('keyed components are moved, not re-created', async () => {
  const root = sandbox()
  const ids = ['a', 'b', 'c']
  render(h('div', null, ids.map((id) => h(Counter, { key: id, label: id }))), root)
  root.querySelectorAll('button')[2].click() // c -> 1
  await nextTick()
  render(h('div', null, ['c', 'a', 'b'].map((id) => h(Counter, { key: id, label: id }))), root)
  assertEqual(root.textContent, 'c:1a:0b:0')
})

// --- createApp ------------------------------------------------------------------

test('createApp renders the root component and re-renders on store changes', async () => {
  const root = sandbox()
  const store = createStore({ name: 'Ann' })
  const App = defineComponent({ render: ({ store }) => h('p', `Hi ${store.getState().name}`) })
  const app = createApp({ root, component: App, store }).mount()
  assertEqual(root.textContent, 'Hi Ann')
  store.setState({ name: 'Bob' })
  store.setState({ name: 'Cy' })
  await nextTick()
  assertEqual(root.textContent, 'Hi Cy')
  app.unmount()
  assertEqual(root.innerHTML, '')
})

// --- VirtualList ------------------------------------------------------------------

test('VirtualList only renders visible rows and follows scrolling', async () => {
  const root = sandbox()
  root.style.cssText = 'position: static'
  document.body.appendChild(root) // must be laid out to scroll
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`)
  render(h(VirtualList, { items, itemHeight: 20, height: 200, overscan: 2 }), root)
  const rows = () => root.querySelectorAll('.vlist-row')
  assert(rows().length <= 14, `expected few rows, got ${rows().length}`)
  assertEqual(rows()[0].textContent, 'Item 0')

  const scroller = root.querySelector('.vlist')
  scroller.scrollTop = 20 * 5000
  scroller.dispatchEvent(new Event('scroll'))
  await nextTick()
  const texts = [...rows()].map((r) => r.textContent)
  assert(texts.includes('Item 5000'), `Item 5000 should be visible, got ${texts[0]}…`)
  assert(rows().length <= 14, 'still only a few rows')
  root.remove()
})
