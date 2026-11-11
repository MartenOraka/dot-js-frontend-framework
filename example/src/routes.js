// Owner: Person C
import { Home } from './pages/Home.js'
import { NotFound } from './pages/NotFound.js'

export const routes = {
  '/': Home,
  '*': NotFound,
}
