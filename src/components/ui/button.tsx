import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { testIdFromProps, type NameProp } from '../../utils/form.utils'
import { cn } from '../../utils/styles.utils'

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2.5 has-[>svg]:px-3',
        icon: 'h-9 px-2.5 py-2.5 has-[>svg]:px-3',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
      },
      variant: {
        default: 'bg-primary text-white shadow-xs hover:bg-primary/90',
        error: 'bg-error text-white shadow-xs hover:bg-error/90 focus-visible:ring-error/20',
        ghost: 'hover:bg-accent hover:text-white',
        outline: 'hover:bg-accent border shadow-xs hover:text-white',
        success: 'bg-success text-white shadow-xs hover:bg-success/80',
      },
    },
  },
)

type ButtonProps = Omit<ComponentProps<'button'>, 'className'> &
  NameProp &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    className?: string
  }

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={cn(buttonVariants({ className, size, variant }))} data-testid={testIdFromProps('button', props)} {...props} />
}
