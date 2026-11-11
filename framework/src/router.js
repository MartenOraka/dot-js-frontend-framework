// Person C (stub for now)
// createRouter({ routes, store }): start, stop, navigate, resolve.
// Writes { path, params, query } to store.route.
// TODO: Link, hash mode, query parsing.

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
