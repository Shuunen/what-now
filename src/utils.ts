export const dom = (type = 'div', content = '', classes = '') => {
  const element = document.createElement(type)
  element.className = classes
  element.innerHTML = content
  return element
}

export const div = (classes = '') => dom('div', '', classes)

export const button = (content = '', classes = '') => {
  return dom('button', content, `bg-blue-800 m-auto sm:ml-0 px-4 py-1 ${classes}`)
}

export const p = (content = '', classes = '') => dom('p', content, classes)
