// Owner: Person C
//
// >>> STUB. Person C implements this file. <<<
// Planned API (see docs/api-contract.md):
//
//   const { data, error, status } = await http.get('/api/todos')
//   await http.post('/api/todos', { title: 'Buy milk' })
//   await http.put(url, body)
//   await http.delete(url)
//
// - JSON request/response handling, timeouts, never throws for HTTP errors
//   (returns { error } instead)
// - Data kept in the store uses the shape { data, loading, error }

function notImplemented() {
  throw new Error('http is not implemented yet (Person C)')
}

export const http = {
  get: notImplemented,
  post: notImplemented,
  put: notImplemented,
  delete: notImplemented,
}
