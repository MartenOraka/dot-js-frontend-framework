// Person A: virtual DOM

export const TEXT = 'text'
export const ELEMENT = 'element'
export const FRAGMENT = 'fragment'
export const COMPONENT = 'component'

const VNODE = Symbol('vnode')

const functionComponents = new WeakMap()

// h(tag, props, ...children)
export function h(tag, props, ...children) {
  // h('p', 'text')
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

export function fragment(...children) {
  const kids = normalizeChildren(children)
  return makeVNode(FRAGMENT, null, {}, kids.length ? kids : [text('')], null)
}

export function text(value) {
  return makeVNode(TEXT, null, {}, [], null, String(value))
}

export function isVNode(value) {
  return value != null && value[VNODE] === true
}

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

export function toComponentDef(tag) {
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
    tag,
    props,
    children,
    key,
    value,
    el: null,
    instance: null,
  }
}
