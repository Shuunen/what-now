import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}
