// Owner: Person C
// The single global store of the example app (see docs/api-contract.md).
// TODO(C): sketch the real state shape early and share it with Person B.

import { createStore } from '/framework/src/index.js'

export const store = createStore({
  // route: { path, params, query }   <- written by the router, do not set it yourself
  // todos: { data: [], loading: false, error: null }   <- shape for data loaded over HTTP
})
