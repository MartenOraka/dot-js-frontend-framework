// Person A
// Batches updates into one render per frame and runs onMount hooks.

const raf =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 0)

const queue = new Set()
let scheduled = false
let waiting = [] // nextTick() promises

// Queue a component to re-render before the next frame.
export function scheduleUpdate(job) {
  queue.add(job)
  requestFlush()
}

// Resolves after pending updates have rendered.
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

// Run all queued updates.
export function flush() {
  scheduled = false
  // Parents first, so children don't render twice.
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

// onMount hooks run once the DOM is in the page.

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
