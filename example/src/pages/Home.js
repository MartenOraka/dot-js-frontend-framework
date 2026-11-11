// Owner: Person C. Placeholder page.
import { h, defineComponent } from '/framework/src/index.js'

export const Home = defineComponent({
  name: 'Home',
  state: () => ({ clicks: 0 }),
  render({ state, setState }) {
    return h('main', null,
      h('h1', 'It works'),
      h('p', 'This placeholder page is rendered by the framework. Person C replaces it with the example app.'),
      h('button', { on: { click: () => setState({ clicks: state.clicks + 1 }) } },
        `Clicked ${state.clicks} times`),
    )
  },
})
