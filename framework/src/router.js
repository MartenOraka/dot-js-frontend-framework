// Owner: Person C
//
// >>> STUB written by Person A so createApp({ routes }) can run. <<<
// Person C replaces this with the real router. createApp relies on this
// API (see docs/api-contract.md):
//
//   const router = createRouter({ routes, store })
//   router.start()                      // read the URL, listen for back/forward
//   router.stop()
//   router.navigate('/todo/3')          // push a new URL
//   router.navigate('/', { replace: true })
//   router.resolve()                    // -> { component, params, path } | null
//
// The router writes the current route into the store under the reserved
// key `route`: { path, params, query }. That store change is what makes
// the app re-render on navigation.
//
// TODO(C): hash mode, query parsing, Link component, guards, base path.

export function createRouter({ routes, store }) {
  const table = Object.entries(routes)
    .filter(([pattern]) => pattern !== '*')
    .map(([pattern, component]) => ({ ...compile(pattern), component }))
  const fallback = routes['*'] || null

  function currentPath() {
    return window.location.pathname || '/'
  }

  function match(path) {
    for (const route of table) {
      const m = route.regex.exec(path)
      if (m) {
        const params = {}
        route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])))
        return { component: route.component, params, path }
      }
    }
    return fallback ? { component: fallback, params: {}, path } : null
  }

  function sync() {
    const path = currentPath()
    const m = match(path)
    store.setState({ route: { path, params: m ? m.params : {}, query: {} } })
  }

  return {
    start() {
      window.addEventListener('popstate', sync)
      sync()
    },
    stop() {
      window.removeEventListener('popstate', sync)
    },
    navigate(path, { replace = false } = {}) {
      if (replace) history.replaceState(null, '', path)
      else history.pushState(null, '', path)
      sync()
    },
    resolve() {
      return match(currentPath())
    },
  }
}

function compile(pattern) {
  const keys = []
  const source = pattern
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1))
        return '([^/]+)'
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return { regex: new RegExp(`^${source}/?$`), keys }
}
