import { XIcon } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Button } from './button'

type ModalProps = {
  children: ReactNode
  onClose: () => void
  testId: string
  title?: string
}

/**
 * A centered modal dialog with a dimmed backdrop, closable via the backdrop, the close button or Escape.
 * @param props - the modal configuration
 * @param props.children - the modal body content
 * @param props.onClose - called when the user dismisses the modal
 * @param props.testId - the data-testid for the modal panel
 * @param props.title - the optional heading shown at the top of the modal
 * @returns the modal element
 */
export function Modal({ children, onClose, testId, title }: ModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid={`${testId}-backdrop`} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-lg border border-gray-600/40 bg-gray-900 p-6 shadow-xl sm:max-w-3xl" data-testid={testId} onClick={event => event.stopPropagation()}>
        {title !== undefined && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="mt-0 mb-0">{title}</h3>
            <Button name="close-modal" onClick={onClose} size="icon" variant="ghost">
              <XIcon className="size-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
