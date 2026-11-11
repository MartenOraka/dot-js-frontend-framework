// A tiny test harness, so the framework has no dev dependencies.
//
//   import { test, assert, assertEqual, sandbox } from './harness.js'
//   test('does a thing', async () => { assertEqual(1 + 1, 2) })

const tests = []

export function test(name, fn) {
  tests.push({ name, fn })
}

export function assert(condition, message = 'assertion failed') {
  if (!condition) throw new Error(message)
}

export function assertEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${message ? message + ': ' : ''}expected ${e}, got ${a}`)
}

/** A fresh, empty element to render into. */
export function sandbox() {
  const host = document.getElementById('sandbox')
  const el = document.createElement('div')
  host.appendChild(el)
  return el
}

export async function run() {
  const results = []
  for (const { name, fn } of tests) {
    try {
      await fn()
      results.push({ name, ok: true })
    } catch (err) {
      results.push({ name, ok: false, error: err && err.message ? err.message : String(err) })
    }
  }
  return results
}
