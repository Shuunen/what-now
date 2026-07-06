import { Command as CommandPrimitive } from 'cmdk'
import type { ComponentProps } from 'react'

export function CommandEmpty(props: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className="py-6 text-center text-sm" data-slot="command-empty" {...props} />
}
