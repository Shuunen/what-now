/* istanbul ignore next */
export const button = (label: string, additionalClasses = '') => {
  const element = document.createElement('button')
  element.className = ['bg-blue-800 m-auto sm:ml-0 px-4 py-1', additionalClasses].join(' ')
  element.textContent = label
  return element
}
