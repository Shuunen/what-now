import { Toast as ToastPrimitive } from 'radix-ui'
import { useCallback, useState } from 'react'
import { type ToastItem, useToastStore, toastVariantClasses } from '../../store/use-toast-store'
import { cn } from '../../utils/styles.utils'
import { Button } from './button'

// Matches the exit animation duration below, so the toast stays mounted long enough to animate out before it's removed from the store.
const closeAnimationMs = 200

/**
 * A single toast, removed from the store once its close animation finishes (after a timeout, action click or swipe)
 * @param props - component properties
 * @param props.toast - the toast to render
 * @returns the toast element
 */
export function Toast({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore(state => state.removeToast)
  const [open, setOpen] = useState(true)
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) setTimeout(() => removeToast(toast.id), closeAnimationMs)
    },
    [removeToast, toast.id],
  )
  const handleAction = useCallback(() => {
    toast.action?.onClick()
    handleOpenChange(false)
  }, [handleOpenChange, toast])
  return (
    <ToastPrimitive.Root
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border p-4 shadow-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full',
        toastVariantClasses[toast.variant],
      )}
      data-testid="toast"
      duration={toast.duration}
      onOpenChange={handleOpenChange}
      open={open}
    >
      <ToastPrimitive.Description className="text-sm">{toast.message}</ToastPrimitive.Description>
      {toast.action !== undefined && (
        <ToastPrimitive.Action altText={toast.action.label} asChild onClick={handleAction}>
          <Button name="toast-action" size="sm" variant="outline">
            {toast.action.label}
          </Button>
        </ToastPrimitive.Action>
      )}
    </ToastPrimitive.Root>
  )
}
