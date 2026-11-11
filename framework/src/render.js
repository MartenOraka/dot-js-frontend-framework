// Person A
// mount: vnode -> DOM, patch: update DOM, unmount: remove.
// Listeners are handled by events.js (Person B).

import { TEXT, ELEMENT, FRAGMENT, COMPONENT, isVNode } from './vdom.js'
import { ComponentInstance } from './component.js'
import { flushMountHooks } from './scheduler.js'
import * as events from './events.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Set as DOM properties so inputs stay in sync.
const DOM_PROPS = new Set(['value', 'checked', 'selected', 'indeterminate', 'muted'])

// render(vnode, container): use without createApp.

const rendered = new WeakMap() // container -> last vnode
const initialisedRoots = new WeakSet()

export function render(vnode, container, appContext = {}) {
  if (!initialisedRoots.has(container)) {
    events.init(container)
    initialisedRoots.add(container)
  }
  const prev = rendered.get(container)
  if (vnode == null) {
    if (prev) unmount(prev)
    rendered.delete(container)
    return
  }
  if (!isVNode(vnode)) throw new TypeError('render(): first argument must be a vnode')
  if (prev) patch(prev, vnode, container, appContext)
  else mount(vnode, container, null, appContext)
  rendered.set(container, vnode)
  flushMountHooks()
}

// --- Mount ---

// Create DOM for vnode, insert before anchor.
export function mount(vnode, parentEl, anchor, app) {
  switch (vnode.type) {
    case TEXT: {
      vnode.el = document.createTextNode(vnode.value)
      parentEl.insertBefore(vnode.el, anchor)
      break
    }
    case ELEMENT: {
      const el = createElement(vnode.tag, parentEl)
      vnode.el = el
      for (const child of vnode.children) mount(child, el, null, app)
      // Props after children so <select value> works.
      setProps(el, {}, vnode.props)
      parentEl.insertBefore(el, anchor)
      if (vnode.props.on) events.attach(el, vnode.props.on)
      setRef(vnode.props.ref, el)
      break
    }
    case FRAGMENT: {
      for (const child of vnode.children) mount(child, parentEl, anchor, app)
      break
    }
    case COMPONENT: {
      const instance = new ComponentInstance(vnode.tag, vnode.props, app)
      vnode.instance = instance
      instance.mount(parentEl, anchor)
      break
    }
    default:
      throw new Error(`mount(): unknown vnode type ${vnode.type}`)
  }
}

function createElement(tag, parentEl) {
  const inSvg =
    tag === 'svg' ||
    (parentEl.namespaceURI === SVG_NS && parentEl.tagName.toLowerCase() !== 'foreignobject')
  return inSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag)
}

// --- Unmount ---

// Remove a vnode, its listeners and components.
export function unmount(vnode, remove = true) {
  switch (vnode.type) {
    case TEXT:
      if (remove) vnode.el.remove()
      break
    case ELEMENT:
      for (const child of vnode.children) unmount(child, false)
      events.detach(vnode.el)
      setRef(vnode.props.ref, null)
      if (remove) vnode.el.remove()
      break
    case FRAGMENT:
      for (const child of vnode.children) unmount(child, remove)
      break
    case COMPONENT:
      vnode.instance.unmount(remove)
      break
  }
}

// --- Patch ---

function sameNode(a, b) {
  return a.type === b.type && a.tag === b.tag && a.key === b.key
}

// Update oldV's DOM to match newV.
export function patch(oldV, newV, parentEl, app) {
  if (oldV === newV) return

  if (!sameNode(oldV, newV)) {
    // Different node: replace it.
    mount(newV, parentEl, firstNode(oldV), app)
    unmount(oldV)
    return
  }

  switch (newV.type) {
    case TEXT:
      newV.el = oldV.el
      if (oldV.value !== newV.value) newV.el.nodeValue = newV.value
      break

    case ELEMENT: {
      const el = (newV.el = oldV.el)
      patchChildren(oldV.children, newV.children, el, null, app)
      setProps(el, oldV.props, newV.props)
      if (oldV.props.on || newV.props.on) {
        events.update(el, oldV.props.on || {}, newV.props.on || {})
      }
      if (oldV.props.ref !== newV.props.ref) {
        setRef(oldV.props.ref, null)
        setRef(newV.props.ref, el)
      }
      break
    }

    case FRAGMENT: {
      const endAnchor = lastNode(oldV).nextSibling
      patchChildren(oldV.children, newV.children, parentEl, endAnchor, app)
      break
    }

    case COMPONENT: {
      const instance = (newV.instance = oldV.instance)
      instance.updateProps(newV.props)
      break
    }
  }
}

// Update a list of children: keyed ones match by key, the rest by position.
function patchChildren(oldCh, newCh, parentEl, endAnchor, app) {
  const oldByKey = new Map()
  const oldUnkeyed = []
  oldCh.forEach((child) => {
    if (child.key != null) oldByKey.set(child.key, child)
    else oldUnkeyed.push(child)
  })

  const seenKeys = new Set()
  const used = new Set()
  const matches = new Array(newCh.length).fill(null)
  let unkeyedIndex = 0

  // 1. Match and patch.
  newCh.forEach((child, i) => {
    let match = null
    if (child.key != null) {
      if (seenKeys.has(child.key)) console.warn(`[framework] duplicate key "${child.key}" in list`)
      seenKeys.add(child.key)
      const candidate = oldByKey.get(child.key)
      if (candidate && !used.has(candidate) && sameNode(candidate, child)) match = candidate
    } else {
      const candidate = oldUnkeyed[unkeyedIndex++]
      if (candidate && sameNode(candidate, child)) match = candidate
    }
    if (match) {
      used.add(match)
      matches[i] = match
      patch(match, child, parentEl, app)
    }
  })

  // 2. Remove unused old nodes.
  for (const child of oldCh) if (!used.has(child)) unmount(child)

  // 3. Put nodes in order (backwards).
  let anchor = endAnchor
  for (let i = newCh.length - 1; i >= 0; i--) {
    const child = newCh[i]
    if (matches[i]) {
      if (lastNode(child).nextSibling !== anchor) {
        for (const node of domNodes(child)) parentEl.insertBefore(node, anchor)
      }
    } else {
      mount(child, parentEl, anchor, app)
    }
    anchor = firstNode(child)
  }
}

// --- Props, class and style ---

function setProps(el, oldProps, newProps) {
  for (const name in oldProps) {
    if (!(name in newProps) && !isSpecial(name)) setProp(el, name, oldProps[name], undefined)
  }
  for (const name in newProps) {
    if (isSpecial(name)) continue
    if (DOM_PROPS.has(name) || oldProps[name] !== newProps[name]) {
      setProp(el, name, oldProps[name], newProps[name])
    }
  }
}

// Not real attributes.
function isSpecial(name) {
  return name === 'on' || name === 'ref' || name === 'key' || name === 'children'
}

function setProp(el, name, oldValue, value) {
  if (name === 'class' || name === 'className') {
    const cls = classString(value)
    if (el.namespaceURI === SVG_NS) el.setAttribute('class', cls)
    else el.className = cls
  } else if (name === 'style') {
    setStyle(el, oldValue, value)
  } else if (DOM_PROPS.has(name)) {
    // Compare with the live value (user may have typed).
    const next = name === 'value' ? (value == null ? '' : String(value)) : Boolean(value)
    if (el[name] !== next) el[name] = next
  } else if (value == null || value === false) {
    el.removeAttribute(name)
  } else if (value === true) {
    el.setAttribute(name, '')
  } else {
    el.setAttribute(name, String(value))
  }
}

// class: string, array or object
export function classString(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(classString).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return Object.keys(value)
      .filter((k) => value[k])
      .join(' ')
  }
  return String(value)
}

// style: string or object
function setStyle(el, oldStyle, newStyle) {
  if (typeof newStyle === 'string' || newStyle == null) {
    el.style.cssText = newStyle || ''
    return
  }
  const old = typeof oldStyle === 'object' && oldStyle ? oldStyle : {}
  if (typeof oldStyle === 'string') el.style.cssText = ''
  for (const key in old) {
    if (!(key in newStyle)) setStyleValue(el, key, '')
  }
  for (const key in newStyle) {
    if (old[key] !== newStyle[key]) setStyleValue(el, key, newStyle[key])
  }
}

function setStyleValue(el, key, value) {
  const v = value == null || value === false ? '' : String(value)
  if (key.startsWith('--')) el.style.setProperty(key, v)
  else el.style[key] = v
}

function setRef(ref, el) {
  if (!ref) return
  if (typeof ref === 'function') ref(el)
  else if (typeof ref === 'object') ref.current = el
}

// --- DOM nodes owned by a vnode ---

export function domNodes(vnode) {
  switch (vnode.type) {
    case TEXT:
    case ELEMENT:
      return [vnode.el]
    case FRAGMENT:
      return vnode.children.flatMap(domNodes)
    case COMPONENT:
      return domNodes(vnode.instance.vnode)
  }
  return []
}

export function firstNode(vnode) {
  if (vnode.type === FRAGMENT) return firstNode(vnode.children[0])
  if (vnode.type === COMPONENT) return firstNode(vnode.instance.vnode)
  return vnode.el
}

export function lastNode(vnode) {
  if (vnode.type === FRAGMENT) return lastNode(vnode.children[vnode.children.length - 1])
  if (vnode.type === COMPONENT) return lastNode(vnode.instance.vnode)
  return vnode.el
}
