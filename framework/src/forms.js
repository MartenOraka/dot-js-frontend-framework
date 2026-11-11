// Owner: Person B
//
// >>> STUB. Person B implements this file. <<<
// Planned API (see docs/api-contract.md):
//
//   formValues(formEl)       -> { title: '...', done: true }   (built with FormData)
//   validate(values, rules)  -> { title: 'Required' }  or {} when valid
//
// Input binding needs no helper: the renderer sets value/checked/selected
// as DOM properties, so this works:
//   h('input', { value: state.title, on: { input: (e) => setState({ title: e.target.value }) } })

export function formValues(_formEl) {
  throw new Error('forms.formValues() is not implemented yet (Person B)')
}

export function validate(_values, _rules) {
  throw new Error('forms.validate() is not implemented yet (Person B)')
}
