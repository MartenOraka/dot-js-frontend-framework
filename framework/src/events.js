// Person B (stub for now)
// TODO: delegation, modifiers, non-bubbling events.
// Keep these 4 functions, the renderer calls them. Handlers get (event, el).

const attached = new WeakMap() // element -> listeners

// Once, on the app root.
export function init(_rootEl) {
  // Stub: nothing to do.
}

// Element mounted.
export function attach(el, on) {
  const list = []
  for (const spec of Object.keys(on)) {
    const handler = on[spec]
    if (typeof handler !== 'function') continue
    const [name, ...modifiers] = spec.split('.')
    const listener = (event) => {
      if (modifiers.includes('self') && event.target !== el) return
      if (modifiers.includes('prevent')) event.preventDefault()
      if (modifiers.includes('stop')) event.stopPropagation()
      handler(event, el)
    }
    el.addEventListener(name, listener, { once: modifiers.includes('once') })
    list.push({ name, listener })
  }
  attached.set(el, list)
}

// Element patched.
export function update(el, _oldOn, newOn) {
  detach(el)
  if (Object.keys(newOn).length) attach(el, newOn)
}

// Element removed.
export function detach(el) {
  const list = attached.get(el)
  if (!list) return
  for (const { name, listener } of list) el.removeEventListener(name, listener)
  attached.delete(el)
}
