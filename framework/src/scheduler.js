// Owner: Person A
//
// Batches re-renders. Calling setState ten times in one click handler must
// not render ten times, so updates are queued and run together once, right
// before the browser paints the next frame (requestAnimationFrame).
//
// It also runs onMount hooks after the DOM has been inserted into the page.

const raf =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 0)

const queue = new Set()
let scheduled = false
let waiting = [] // resolve functions from nextTick()

/**
 * Queue a job to run before the next frame. A job is anything with
 * `depth` (number), `dirty` (boolean) and `update()`; in practice it is a
 * component instance. Queuing the same job twice runs it once.
 */
export function scheduleUpdate(job) {
  queue.add(job)
  requestFlush()
}

/** Resolves after pending updates have been rendered. Handy in tests. */
export function nextTick() {
  return new Promise((resolve) => {
    waiting.push(resolve)
    requestFlush()
  })
}

function requestFlush() {
  if (!scheduled) {
    scheduled = true
    raf(flush)
  }
}

/** Run all queued updates now. Normally called by the scheduler itself. */
export function flush() {
  scheduled = false
  // Parents first: re-rendering a parent also re-renders its children,
  // which clears their `dirty` flag so they are not rendered twice.
  const jobs = [...queue].sort((a, b) => a.depth - b.depth)
  queue.clear()
  for (const job of jobs) {
    if (job.dirty) job.update()
  }
  flushMountHooks()
  const resolvers = waiting
  waiting = []
  resolvers.forEach((resolve) => resolve())
}

// ---------------------------------------------------------------------------
// onMount hooks run after the whole tree is in the document, not while it is
// still being built, so components can measure elements or focus inputs.

const mountHooks = []

export function queueMountHook(fn) {
  mountHooks.push(fn)
}

export function flushMountHooks() {
  while (mountHooks.length) {
    const fn = mountHooks.shift()
    try {
      fn()
    } catch (err) {
      console.error('[framework] error in onMount:', err)
    }
  }
}
