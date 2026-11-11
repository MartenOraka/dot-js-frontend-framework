// Person B (stub for now)
// createStore: getState, setState, subscribe (returns unsubscribe).
// TODO: select, tests.

export function createStore(initialState = {}) {
  let state = initialState
  const listeners = new Set()

  return {
    getState() {
      return state
    },
    setState(partial) {
      const next = typeof partial === 'function' ? partial(state) : partial
      if (next == null) return
      const prev = state
      state = { ...state, ...next }
      listeners.forEach((listener) => listener(state, prev))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
