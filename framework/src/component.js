// Owner: Person A
//
// Reusable components. A component is described once with defineComponent()
// and used any number of times with h(MyComponent, props).
//
//   const Counter = defineComponent({
//     name: 'Counter',
//     state: (props) => ({ count: props.start ?? 0 }),
//     render({ props, state, setState, store, router }) {
//       return h('button', { on: { click: () => setState({ count: state.count + 1 }) } },
//         `${props.label}: ${state.count}`)
//     },
//     onMount({ el }) {},     // after the component's DOM is in the page
//     onUnmount() {},         // before it is removed
//   })
//
// Plain functions also work as components without local state:
//   const Hello = ({ props }) => h('p', `Hello ${props.name}`)

import { toVNode } from './vdom.js'
import { mount, patch, unmount, firstNode } from './render.js'
import { scheduleUpdate, queueMountHook } from './scheduler.js'

export function defineComponent(options) {
  if (!options || typeof options.render !== 'function') {
    throw new TypeError('defineComponent(): a render function is required')
  }
  if (options.state != null && typeof options.state !== 'function') {
    throw new TypeError('defineComponent(): state must be a function that returns an object')
  }
  return { name: 'Component', ...options, __isComponent: true }
}

// The component currently mounting or rendering. Used to give every
// instance a depth (parents are updated before their children).
let current = null

export class ComponentInstance {
  /**
   * @param {object} def    component definition from defineComponent()
   * @param {object} props  props passed via h(Component, props)
   * @param {object} app    shared context: { store, router }
   */
  constructor(def, props, app = {}) {
    this.def = def
    this.props = props
    this.app = app
    this.state = def.state ? def.state(props) || {} : {}
    this.vnode = null
    this.mounted = false
    this.dirty = false
    this.depth = current ? current.depth + 1 : 0
    this.setState = this.setState.bind(this)
  }

  /** Merge a partial state (or the result of fn(state, props)) and re-render. */
  setState(partial) {
    const next = typeof partial === 'function' ? partial(this.state, this.props) : partial
    if (next == null) return
    this.state = { ...this.state, ...next }
    if (this.mounted) {
      this.dirty = true
      scheduleUpdate(this)
    }
  }

  /** The object every render function and hook receives. */
  context() {
    return {
      props: this.props,
      state: this.state,
      setState: this.setState,
      children: this.props.children || [],
      store: this.app.store,
      router: this.app.router,
      el: this.vnode && this.mounted ? firstNode(this.vnode) : null,
    }
  }

  renderVNode() {
    const prev = current
    current = this
    try {
      return toVNode(this.def.render(this.context()))
    } finally {
      current = prev
    }
  }

  mount(parentEl, anchor) {
    this.vnode = this.renderVNode()
    const prev = current
    current = this
    try {
      mount(this.vnode, parentEl, anchor, this.app)
    } finally {
      current = prev
    }
    this.mounted = true
    if (this.def.onMount) queueMountHook(() => this.mounted && this.def.onMount(this.context()))
  }

  /** Re-render and patch the DOM. Called by the scheduler or by a parent. */
  update() {
    if (!this.mounted) return
    this.dirty = false
    const oldVNode = this.vnode
    const newVNode = this.renderVNode()
    this.vnode = newVNode
    const parentEl = firstNode(oldVNode).parentNode
    const prev = current
    current = this
    try {
      patch(oldVNode, newVNode, parentEl, this.app)
    } finally {
      current = prev
    }
  }

  /** A parent re-rendered and passed new props. */
  updateProps(props) {
    this.props = props
    this.update()
  }

  unmount(remove = true) {
    if (!this.mounted) return
    if (this.def.onUnmount) {
      try {
        this.def.onUnmount(this.context())
      } catch (err) {
        console.error('[framework] error in onUnmount:', err)
      }
    }
    this.mounted = false
    this.dirty = false
    unmount(this.vnode, remove)
  }
}
