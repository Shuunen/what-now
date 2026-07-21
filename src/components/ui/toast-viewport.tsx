import { Toast as ToastPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { useToastStore } from '../../store/use-toast-store'
import { Toast } from './toast'

/**
 * Root provider + viewport for the app's toasts, mounted once at the app root. Renders every toast currently in the toast store.
 * @param props - component properties
 * @param props.children - the app content
 * @returns the wrapped app content
 */
export function ToastViewportProvider({ children }: { children: ReactNode }) {
  const toasts = useToastStore(state => state.toasts)
  return (
    <ToastPrimitive.Provider>
      {children}
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-100 flex w-80 max-w-full flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  )
}
