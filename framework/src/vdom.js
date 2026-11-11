// Person A
// h() creates vnodes: plain objects that describe the UI.
// Types: text, element, fragment, component.

export const TEXT = 'text'
export const ELEMENT = 'element'
export const FRAGMENT = 'fragment'
export const COMPONENT = 'component'

const VNODE = Symbol('vnode')

// Same function -> same component definition.
const functionComponents = new WeakMap()

// h(tag, props, ...children)
// h('div', { class: 'card' }, 'Hi')   h('p', 'text')   h(Item, { key: 1 })
export function h(tag, props, ...children) {
  // props skipped: h('p', 'text')
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

// Siblings without a wrapper element.
export function fragment(...children) {
  const kids = normalizeChildren(children)
  // Empty fragment gets an empty text node.
  return makeVNode(FRAGMENT, null, {}, kids.length ? kids : [text('')], null)
}

// Text vnode.
export function text(value) {
  return makeVNode(TEXT, null, {}, [], null, String(value))
}

export function isVNode(value) {
  return value != null && value[VNODE] === true
}

// Any render result -> one vnode (null -> empty text, array -> fragment).
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
    tag, // tag name or component
    props,
    children,
    key,
    value, // text only
    el: null, // real DOM node
    instance: null, // component only
  }
}
