// Owner: Person A
//
// Virtual DOM nodes ("vnodes") are plain objects that describe what the UI
// should look like. The renderer (render.js) turns them into real DOM nodes
// and later patches the DOM when a new vnode tree is produced.
//
// There are four kinds of vnode:
//   text      -> a DOM text node
//   element   -> a DOM element such as <div> or <button>
//   fragment  -> a group of siblings without a wrapper element
//   component -> a reusable component (see component.js)

export const TEXT = 'text'
export const ELEMENT = 'element'
export const FRAGMENT = 'fragment'
export const COMPONENT = 'component'

const VNODE = Symbol('vnode')

// Plain functions used as components are wrapped once, so the same function
// always maps to the same definition object (the renderer compares
// definitions by identity to decide whether it can reuse a component).
const functionComponents = new WeakMap()

/**
 * Create a vnode.
 *
 *   h('div', { class: 'card' }, 'Hello', h('b', null, 'world'))
 *   h('p', 'Props can be skipped when there are none')
 *   h(TodoItem, { todo, key: todo.id })
 *
 * @param {string|object|function} tag  HTML tag name, component definition
 *                                      (from defineComponent) or a function
 * @param {object} [props]              attributes, `on`, `style`, `class`, `key`, `ref`
 * @param {...any} children             vnodes, strings, numbers, arrays;
 *                                      null/undefined/true/false are skipped
 */
export function h(tag, props, ...children) {
  // Allow skipping props: h('p', 'text') or h('ul', [items])
  if (props != null && (typeof props !== 'object' || Array.isArray(props) || isVNode(props))) {
    children.unshift(props)
    props = null
  }
  const { key = null, ...rest } = props || {}
  const kids = normalizeChildren(children)

  if (typeof tag === 'function' || (tag && typeof tag === 'object')) {
    const def = toComponentDef(tag)
    return makeVNode(COMPONENT, def, { ...rest, children: kids }, [], key)
  }
  if (typeof tag !== 'string' || tag === '') {
    throw new TypeError(`h(): invalid tag ${String(tag)}`)
  }
  return makeVNode(ELEMENT, tag, rest, kids, key)
}

/** Group several nodes without adding a wrapper element. */
export function fragment(...children) {
  const kids = normalizeChildren(children)
  // Every vnode must own at least one DOM node so the renderer always has
  // a position marker. An empty fragment gets an empty text node.
  return makeVNode(FRAGMENT, null, {}, kids.length ? kids : [text('')], null)
}

/** Create a text vnode. Usually you just pass strings to h() instead. */
export function text(value) {
  return makeVNode(TEXT, null, {}, [], null, String(value))
}

export function isVNode(value) {
  return value != null && value[VNODE] === true
}

/**
 * Turn anything a render function may return into exactly one vnode:
 * null/false -> empty text, string/number -> text, array -> fragment.
 */
export function toVNode(value) {
  if (isVNode(value)) return value
  if (value == null || value === false || value === true) return text('')
  if (Array.isArray(value)) return fragment(...value)
  return text(value)
}

function normalizeChildren(children, out = []) {
  for (const child of children) {
    if (child == null || child === false || child === true) continue
    if (Array.isArray(child)) normalizeChildren(child, out)
    else if (isVNode(child)) out.push(child)
    else out.push(text(child))
  }
  return out
}

function toComponentDef(tag) {
  if (typeof tag === 'function') {
    let def = functionComponents.get(tag)
    if (!def) {
      def = { name: tag.name || 'Anonymous', render: tag, __isComponent: true }
      functionComponents.set(tag, def)
    }
    return def
  }
  if (!tag.__isComponent || typeof tag.render !== 'function') {
    throw new TypeError('h(): objects used as tags must be created with defineComponent()')
  }
  return tag
}

function makeVNode(type, tag, props, children, key, value = null) {
  return {
    [VNODE]: true,
    type,
    tag, // tag name (element) or component definition (component)
    props,
    children,
    key,
    value, // text content (text vnodes only)
    el: null, // the real DOM node, set when mounted (element/text)
    instance: null, // the component instance (component vnodes only)
  }
}
