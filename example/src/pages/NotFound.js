// Owner: Person C
import { h } from '/framework/src/index.js'

export const NotFound = ({ store }) =>
  h('main', null, h('h1', 'Page not found'), h('p', `No page at ${store.getState().route.path}`))
