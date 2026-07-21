import { create } from 'zustand'

export type ToastVariant = 'error' | 'info' | 'success'

export const toastVariantClasses: Record<ToastVariant, string> = {
  error: 'border-error bg-error text-white',
  info: 'border-primary bg-primary text-white',
  success: 'border-success bg-success text-white',
}

export type ToastItem = {
  action?: { label: string; onClick: () => void }
  duration: number
  id: string
  message: string
  variant: ToastVariant
}

type ToastStore = {
  removeToast: (id: string) => void
  toasts: ToastItem[]
}

export const useToastStore = create<ToastStore>()(set => ({
  removeToast: id => set(state => ({ toasts: state.toasts.filter(toast => toast.id !== id) })),
  toasts: [],
}))

function pushToast(variant: ToastVariant, message: string, options: { action?: ToastItem['action']; duration: number }) {
  const toast: ToastItem = { action: options.action, duration: options.duration, id: crypto.randomUUID(), message, variant }
  useToastStore.setState(state => ({ toasts: [...state.toasts, toast] }))
}

/**
 * Displays a success toast message
 * @param message - the success message to display
 * @param duration - the delay in milliseconds before the toast disappears, defaults to 2000ms
 */
export function toastSuccess(message: string, duration = 2000) {
  pushToast('success', message, { duration })
}

/**
 * Displays an error toast message
 * @param message - the error message to display
 * @param duration - the delay in milliseconds before the toast disappears, defaults to 4000ms
 */
export function toastError(message: string, duration = 4000) {
  pushToast('error', message, { duration })
}

/**
 * Displays an info toast message
 * @param message - the info message to display
 * @param duration - the delay in milliseconds before the toast disappears, defaults to 3000ms
 */
export function toastInfo(message: string, duration = 3000) {
  pushToast('info', message, { duration })
}

/**
 * Displays a success toast message with an action button, e.g. to undo the action that triggered it
 * @param message - the toast message to display
 * @param action - the action button's label and click handler
 * @param duration - the delay in milliseconds before the toast disappears, defaults to 10000ms
 */
export function toastAction(message: string, action: { label: string; onClick: () => void }, duration = 10_000) {
  pushToast('success', message, { action, duration })
}
