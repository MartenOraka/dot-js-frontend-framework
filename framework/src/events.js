// Owner: Person B
//
// >>> STUB written by Person A so the renderer can run. <<<
// Person B replaces this file with the real implementation:
//   - delegation: one real listener per event type on the root (init),
//     a WeakMap from element to handlers, walk up from event.target
//   - modifiers: .prevent .stop .once .self
//   - non-bubbling events (focus, blur, mouseenter, scroll, ...)
//
// Keep these four exports and their signatures exactly; the renderer
// (render.js, app.js) calls them. See docs/api-contract.md.
//
// Developers write:   on: { click: fn, 'submit.prevent': fn }
// Handlers receive:   (event, el)  where el is the element the handler is on

const attached = new WeakMap() // element -> [{ name, listener }]

/** Called once by createApp with the app's root element. */
export function init(_rootEl) {
  // Stub: nothing to do, listeners are attached directly to each element.
}

/** Called when an element with an `on` prop is mounted. */
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

/** Called on every patch of an element that has (or had) an `on` prop. */
export function update(el, _oldOn, newOn) {
  detach(el)
  if (Object.keys(newOn).length) attach(el, newOn)
}

/** Called for every element in a subtree that is being removed. */
export function detach(el) {
  const list = attached.get(el)
  if (!list) return
  for (const { name, listener } of list) el.removeEventListener(name, listener)
  attached.delete(el)
}
