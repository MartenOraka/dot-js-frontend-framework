// Person A
// createApp({ root, routes or component, store }).mount()
// The framework calls your code and re-renders on changes.

import { h } from './vdom.js'
import { defineComponent, ComponentInstance } from './component.js'
import { scheduleUpdate, flushMountHooks } from './scheduler.js'
import * as events from './events.js'
import { createStore } from './store.js'
import { createRouter } from './router.js'

// Shows the page for the current URL.
export const RouterView = defineComponent({
  name: 'RouterView',
  render({ router }) {
    if (!router) throw new Error('RouterView needs createApp({ routes })')
    const match = router.resolve()
    if (!match) return h('p', 'Page not found')
    return h(match.component, { params: match.params })
  },
})

// options: root, component or routes, store, routerOptions
export function createApp(options = {}) {
  const { root, component, routes, routerOptions = {} } = options
  if (!root) throw new Error('createApp(): "root" is required')
  if (!component && !routes) throw new Error('createApp(): pass "component" or "routes"')

  const store = options.store || createStore({})
  const router = routes ? createRouter({ routes, store, ...routerOptions }) : null
  const context = { store, router }
  const RootComponent = component || RouterView

  let rootEl = null
  let instance = null
  let unsubscribe = null

  const app = {
    store,
    router,

    mount() {
      if (instance) throw new Error('createApp(): app is already mounted')
      rootEl = typeof root === 'string' ? document.querySelector(root) : root
      if (!rootEl) throw new Error(`createApp(): root "${root}" not found`)
      rootEl.textContent = ''

      events.init(rootEl)
      if (router) router.start()

      instance = new ComponentInstance(RootComponent, { children: [] }, context)
      instance.mount(rootEl, null)
      flushMountHooks()

      // Re-render on any store change (route changes too).
      unsubscribe = store.subscribe(() => {
        instance.dirty = true
        scheduleUpdate(instance)
      })
      return app
    },

    unmount() {
      if (!instance) return
      if (unsubscribe) unsubscribe()
      if (router) router.stop()
      instance.unmount(true)
      instance = null
    },
  }
  return app
}
