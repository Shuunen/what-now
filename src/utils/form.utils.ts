import { invariant, kebabCase } from 'es-toolkit'

export type NameProp = {
  /** a name of the form field or component, like firstName or email */
  name: string
}

export function testIdFromProps(prefix: string, props: NameProp): string {
  invariant(prefix !== '', 'prefix cannot be empty string when deriving testId from name')
  invariant(props.name !== '', 'name cannot be empty string when deriving testId from name')
  return kebabCase(`${prefix}-${props.name}`)
}
