/* istanbul ignore next */
export const emit = (eventName: string, eventData: unknown) => {
  if (global.window === undefined) return
  window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
}

/* istanbul ignore next */
export const on = (eventName: string, callback: (data: any) => unknown) => {
  window.addEventListener(eventName, event => callback((event as CustomEvent).detail))
}
