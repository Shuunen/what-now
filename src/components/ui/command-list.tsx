import { Command as CommandPrimitive } from 'cmdk'
import type { ComponentProps } from 'react'
import { cn } from '../../utils/styles.utils'

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)} data-slot="command-list" {...props} />
}
