// Owner: Person B
//
// >>> STUB written by Person A so createApp can run. <<<
// Person B replaces this with the real store. Keep this API
// (see docs/api-contract.md):
//
//   const store = createStore({ todos: [] })
//   store.getState()
//   store.setState({ filter: 'done' })                 // shallow merge
//   store.setState(s => ({ todos: [...s.todos, t] }))  // function form
//   const unsubscribe = store.subscribe((state, prevState) => {})
//
// Rules: never mutate state; notify subscribers synchronously
// (createApp batches the re-render, the store must not).
// TODO(B): select(selector, listener), dev warnings, tests.

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
