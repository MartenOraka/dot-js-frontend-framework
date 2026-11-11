// Person C (not started)
// http.get/post/put/delete -> { data, error, status }

function notImplemented() {
  throw new Error('http is not implemented yet (Person C)')
}

export const http = {
  get: notImplemented,
  post: notImplemented,
  put: notImplemented,
  delete: notImplemented,
}
