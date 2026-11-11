// Owner: Person A
//
// createApp() is the entry point of every application. The developer
// describes the app (root element, components or routes, store) and the
// framework takes control: it renders, listens for state and URL changes,
// and re-renders. The developer's code is called by the framework, not the
// other way round. That is what makes this a framework rather than a library.
//
//   createApp({ root: '#app', routes, store }).mount()
//   createApp({ root: '#app', component: App, store }).mount()

import { h } from './vdom.js'
import { defineComponent, ComponentInstance } from './component.js'
import { scheduleUpdate, flushMountHooks } from './scheduler.js'
import * as events from './events.js'
import { createStore } from './store.js'
import { createRouter } from './router.js'

/** Renders the component that matches the current URL. */
export const RouterView = defineComponent({
  name: 'RouterView',
  render({ router }) {
    if (!router) throw new Error('RouterView needs createApp({ routes })')
    const match = router.resolve()
    if (!match) return h('p', 'Page not found')
    return h(match.component, { params: match.params })
  },
})

/**
 * @param {object} options
 * @param {string|Element} options.root    CSS selector or element to render into
 * @param {object} [options.component]     root component (when not using routes)
 * @param {object} [options.routes]        { '/path/:id': Component, '*': NotFound }
 * @param {object} [options.store]         store from createStore(); one is made if omitted
 * @param {object} [options.routerOptions] extra options for createRouter (e.g. mode)
 */
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

      // Any store change (including route changes, which the router writes
      // into the store) re-renders the app once, before the next frame.
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
