// Person A
// defineComponent({ state, render, onMount, onUnmount })
// Plain functions work too: ({ props }) => h('p', props.name)

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

// Component being rendered right now (used for depth).
let current = null

export class ComponentInstance {
  // def: from defineComponent, app: { store, router }
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

  // Merge state and re-render.
  setState(partial) {
    const next = typeof partial === 'function' ? partial(this.state, this.props) : partial
    if (next == null) return
    this.state = { ...this.state, ...next }
    if (this.mounted) {
      this.dirty = true
      scheduleUpdate(this)
    }
  }

  // What render() and hooks receive.
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

  // Re-render and update the DOM.
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

  // Parent passed new props.
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
