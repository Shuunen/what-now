import { invariant } from 'es-toolkit'
import { toastAction, toastError, toastInfo, toastSuccess, toastVariantClasses, useToastStore } from './use-toast-store'

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('A toastSuccess pushes a success toast with the default duration', () => {
    toastSuccess('saved')
    expect(useToastStore.getState().toasts).toStrictEqual([{ action: undefined, duration: 2000, id: expect.any(String) as string, message: 'saved', variant: 'success' }])
  })

  it('B toastError pushes an error toast with the default duration', () => {
    toastError('oops')
    expect(useToastStore.getState().toasts).toStrictEqual([{ action: undefined, duration: 4000, id: expect.any(String) as string, message: 'oops', variant: 'error' }])
  })

  it('C toastInfo pushes an info toast with the default duration', () => {
    toastInfo('fyi')
    expect(useToastStore.getState().toasts).toStrictEqual([{ action: undefined, duration: 3000, id: expect.any(String) as string, message: 'fyi', variant: 'info' }])
  })

  it('D toastAction pushes a success toast carrying the action', () => {
    const onClick = vi.fn<() => void>()
    toastAction('deleted', { label: 'Undo', onClick })
    const [toast] = useToastStore.getState().toasts
    expect(toast?.action).toStrictEqual({ label: 'Undo', onClick })
    expect(toast?.duration).toBe(10_000)
  })

  it('E custom durations override the defaults', () => {
    toastSuccess('saved', 500)
    expect(useToastStore.getState().toasts[0]?.duration).toBe(500)
  })

  it('F removeToast drops the matching toast, leaving others untouched', () => {
    toastSuccess('first')
    toastSuccess('second')
    const [first] = useToastStore.getState().toasts
    invariant(first, 'first toast must exist')
    useToastStore.getState().removeToast(first.id)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0]?.message).toBe('second')
  })
})

describe('toastVariantClasses', () => {
  it('has a class string for every toast variant', () => {
    expect(toastVariantClasses.success).toBeTypeOf('string')
    expect(toastVariantClasses.error).toBeTypeOf('string')
    expect(toastVariantClasses.info).toBeTypeOf('string')
  })
})
