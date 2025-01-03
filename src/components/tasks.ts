/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable jsdoc/require-jsdoc */
import confetti from 'canvas-confetti'
import { div, dom, emit, on, pickOne, sleep, tw } from 'shuutils'
import type { AirtableResponse, AirtableTask } from '../types'
import { button } from '../utils/dom.utils'
import { logger } from '../utils/logger.utils'
import { state, watchState } from '../utils/state.utils'
import { isTaskActive, toggleComplete } from '../utils/tasks.utils'
import { progress } from './progress'

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '💔', '🧡', '💛', '💚', '💙', '💜', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '💣', '💬', '👁️‍🗨️', '💭', '💤', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏', '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍🚒', '👩‍🚒', '👮', '👮‍♂️', '👮‍♀️', '🕵', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '🤴', '👸', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦸‍♂️', '🦸‍♀️', '🦹', '🦹‍♂️', '🦹‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '💆', '💆‍♂️', '💆‍♀️', '💇', '💇‍♂️', '💇‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️', '🧍', '🧍‍♂️', '🧍‍♀️', '🧎', '🧎‍♂️', '🧎‍♀️', '👨‍🦯', '👩‍🦯', '👨‍🦼', '👩‍🦼', '👨‍🦽', '👩‍🦽', '🏃', '🏃‍♂️', '🏃‍♀️', '💃', '🕺', '🕴', '👯', '👯‍♂️', '👯‍♀️', '🧖', '🧖‍♂️', '🧖‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️', '🤺', '🏇', '⛷', '🏂', '🏌', '🏌️‍♂️', '🏌️‍♀️', '🏄', '🏄‍♂️', '🏄‍♀️', '🚣', '🚣‍♂️', '🚣‍♀️', '🏊', '🏊‍♂️', '🏊‍♀️', '⛹', '⛹️‍♂️', '⛹️‍♀️', '🏋', '🏋️‍♂️', '🏋️‍♀️', '🚴', '🚴‍♂️', '🚴‍♀️', '🚵', '🚵‍♂️', '🚵‍♀️', '🤸', '🤸‍♂️', '🤸‍♀️', '🤼', '🤼‍♂️', '🤼‍♀️', '🤽', '🤽‍♂️', '🤽‍♀️', '🤾', '🤾‍♂️', '🤾‍♀️', '🤹', '🤹‍♂️', '🤹‍♀️', '🧘', '🧘‍♂️', '🧘‍♀️', '🛀', '🛌', '👣', '🦰', '🦱', '🦳', '🦲', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🦅', '🦆', '🦢', '🦉', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🦂', '🦟', '🦠', '💐', '🌸', '💮', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘', '🍀', '🍁', '🍂', '🍃', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽', '🍴', '🥄', '🔪', '🏺', '🌍', '🌎', '🌏', '🌐', '🗾', '🧭', '🏔', '⛰', '🌋', '🗻', '🧱', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩', '🕋', '⛲', '⛺', '🌁', '🌃', '🌄', '🌅', '🌆', '🌇', '🌉', '🎠', '🎡', '🎢', '💈', '🎪', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🛵', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🚏', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛶', '🚤', '🚢', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰', '🚀', '🛸', '🧳', '⌛', '⏳', '⌚', '⏰', '⏱', '⏲', '🕰', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '⛅', '🌀', '🌈', '🌂', '☔', '⚡', '⛄', '🔥', '💧', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗', '🎟', '🎫', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🎱', '🔮', '🧿', '🎮', '🎰', '🎲', '🧩', '🧸', '🃏', '🀄', '🎴', '🎭', '🎨', '🧵', '🧶', '👓', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎤', '🎧', '📻', '🎷', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '📱', '📲', '📞', '📟', '📠', '🔋', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞', '📑', '🔖', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '📝', '📁', '📂', '🗂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📏', '📐', '🔒', '🔓', '🔏', '🔐', '🔑', '🔨', '🪓', '🔫', '🏹', '🔧', '🔩', '🦯', '🔗', '🧰', '🧲', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🪑', '🚽', '🚿', '🛁', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🚬', '🗿', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐', '🕎', '🔯', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔀', '🔁', '🔂', '▶', '⏩', '⏭', '⏯', '◀', '⏪', '⏮', '🔼', '⏫', '🔽', '⏬', '⏸', '⏹', '⏺', '⏏', '🎦', '📶', '📳', '📴', '💱', '💲', '🔱', '📛', '🔰', '⭕', '❌', '➰', '➿', '#️⃣', '*️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰', '🆎', '🅱', '🆑', '🆒', '🆓', '🆔', '🆕', '🆖', '🅾', '🆗', '🅿', '🆘', '🆙', '🆚', '🈁', '🈶', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '🈺', '🈵', '🔴', '🟠', '🟡', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟦', '🟪', '🟫', '⬛', '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '🏁', '🚩', '🎌', '🏴', '🏳️‍🌈', '🏴‍☠️', '🏴󠁧󠁢󠁷󠁬󠁳󠁿']

const tasks = div(tw('app-tasks grid gap-2'))
const lines: HTMLButtonElement[] = []

const fireworksLeft = new Audio('/fireworks.mp3')
const fireworksRight = new Audio('/fireworks.mp3')
tasks.append(progress)

const retry = button('Setup credentials', tw('mt-4 hidden'))
retry.addEventListener('click', () => {
  state.isSetup = false
  emit('need-credentials')
  retry.classList.toggle('hidden')
})
tasks.append(retry)

function handleError (response: AirtableResponse) {
  logger.error('handle error response', response)
  let message = response.error && response.error.type === 'UNAUTHORIZED' ? 'The credentials you provided does not work' : 'Failed to fetch data from Airtable'
  message += ', click the button below to try again.'
  state.statusError = message
  retry.classList.toggle('hidden')
}

on('get-tasks-error', handleError)

function updateLine (line: HTMLElement, task: AirtableTask) {
  const isActive = isTaskActive(task)
  const isDatasetActive = line.dataset.active === 'true'
  logger.debug('update line', line, 'was', isDatasetActive ? 'active' : 'inactive', 'now', isActive ? 'active' : 'inactive')
  line.dataset.active = String(isActive)
  line.innerHTML = `${isActive ? pickOne(emojis) : '✔️'}&nbsp; ${task.fields.name}`
  line.classList.toggle('opacity-60', !isActive)
}

function createLine (task: AirtableTask) {
  const line = dom('button', tw('app-task -ml-2 mr-auto max-w-full truncate px-2 py-1 text-start transition-transform duration-300 ease-out'), task.fields.name)
  line.dataset.taskId = task.id
  updateLine(line, task)
  lines.push(line)
  return line
}

function tossCoin () {
  return Math.random() > 0.7 // eslint-disable-line @typescript-eslint/no-magic-numbers
}

// eslint-disable-next-line @typescript-eslint/max-params, id-length
async function throwConfetti (x: number, y: number, angle: number, sound: HTMLAudioElement) {
  void sound.play()
  void confetti({ angle, origin: { x, y } }) // eslint-disable-line id-length
  await sleep(200) // eslint-disable-line @typescript-eslint/no-magic-numbers
}

async function throwConfettiAround (element: HTMLElement) {
  /* eslint-disable @typescript-eslint/no-magic-numbers */
  const { bottom, left, right } = element.getBoundingClientRect()
  const delta = window.innerWidth < 450 ? 90 : 30
  const positionY = Math.round(bottom / window.innerHeight * 100) / 100
  let positionX = Math.round((left + delta) / window.innerWidth * 100) / 100
  const angle = 20
  if (tossCoin()) await throwConfetti(positionX, positionY, 90 + angle, fireworksLeft)
  positionX = Math.round((right - delta) / window.innerWidth * 100) / 100
  if (tossCoin()) await throwConfetti(positionX, positionY, 90 - angle, fireworksRight)
  /* eslint-enable @typescript-eslint/no-magic-numbers */
}

async function visuallyToggleComplete (line: HTMLElement, task: AirtableTask) {
  line.classList.add('scale-125')
  void toggleComplete(task)
  await sleep(200) // eslint-disable-line @typescript-eslint/no-magic-numbers
  line.classList.remove('scale-125')
}

function getTaskFromElement (element: HTMLElement | null, list: AirtableTask[]) {
  const task = list.find(item => item.id === element?.dataset.taskId)
  if (task === undefined) logger.error('failed to find task with id', element?.dataset.taskId, 'in list', list)
  return task
}

function onClick (line: HTMLElement | null, list: AirtableTask[]) {
  if (line?.dataset.taskId === undefined) return
  const task = getTaskFromElement(line, list)
  if (task === undefined) return
  void visuallyToggleComplete(line, task)
  if (!isTaskActive(task)) void throwConfettiAround(line)
  state.tasks = state.tasks.map(item => (item.id === task.id ? task : item))
  updateLine(line, task)
}

// eslint-disable-next-line max-statements
function updateList (list: AirtableTask[]) {
  if (list.length === 0) { logger.info('no task list to display'); return }
  logger.info('update list...')
  const processed: string[] = []
  for (const line of lines) {
    const task = list.find(item => (item.id === line.dataset.taskId))
    if (task === undefined) line.classList.add('hidden') // hide the task in dom that is not active anymore
    else {
      processed.push(task.id)
      updateLine(line, task)
    }
  }
  const missing = list.filter(item => !processed.includes(item.id)) // exists on Airtable but not in dom
  if (missing.length > 0) logger.info('missing tasks', missing)
  for (const task of missing) tasks.append(createLine(task))
}

watchState('tasks', () => { updateList(state.tasks) })

watchState('isSetup', () => { if (state.isSetup && state.tasks.length > 0) updateList(state.tasks) })

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
tasks.addEventListener('click', (event: Event) => { onClick(event.target as HTMLElement, state.tasks) })

export { tasks }

