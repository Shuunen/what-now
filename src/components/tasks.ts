import confetti from 'canvas-confetti'
import { div, dom, emit, Nb, on, pickOne, sleep, storage, tw } from 'shuutils'
import { state, watch } from '../state'
import type { AirtableResponse, AirtableTask } from '../utils/airtable'
import { button } from '../utils/dom'
import { isTaskActive, toggleComplete } from '../utils/tasks'
import { progress } from './progress'

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '💔', '🧡', '💛', '💚', '💙', '💜', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '💣', '💬', '👁️‍🗨️', '💭', '💤', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏', '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍🚒', '👩‍🚒', '👮', '👮‍♂️', '👮‍♀️', '🕵', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️', '👷‍♀️', '🤴', '👸', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦸‍♂️', '🦸‍♀️', '🦹', '🦹‍♂️', '🦹‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '💆', '💆‍♂️', '💆‍♀️', '💇', '💇‍♂️', '💇‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️', '🧍', '🧍‍♂️', '🧍‍♀️', '🧎', '🧎‍♂️', '🧎‍♀️', '👨‍🦯', '👩‍🦯', '👨‍🦼', '👩‍🦼', '👨‍🦽', '👩‍🦽', '🏃', '🏃‍♂️', '🏃‍♀️', '💃', '🕺', '🕴', '👯', '👯‍♂️', '👯‍♀️', '🧖', '🧖‍♂️', '🧖‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️', '🤺', '🏇', '⛷', '🏂', '🏌', '🏌️‍♂️', '🏌️‍♀️', '🏄', '🏄‍♂️', '🏄‍♀️', '🚣', '🚣‍♂️', '🚣‍♀️', '🏊', '🏊‍♂️', '🏊‍♀️', '⛹', '⛹️‍♂️', '⛹️‍♀️', '🏋', '🏋️‍♂️', '🏋️‍♀️', '🚴', '🚴‍♂️', '🚴‍♀️', '🚵', '🚵‍♂️', '🚵‍♀️', '🤸', '🤸‍♂️', '🤸‍♀️', '🤼', '🤼‍♂️', '🤼‍♀️', '🤽', '🤽‍♂️', '🤽‍♀️', '🤾', '🤾‍♂️', '🤾‍♀️', '🤹', '🤹‍♂️', '🤹‍♀️', '🧘', '🧘‍♂️', '🧘‍♀️', '🛀', '🛌', '👣', '🦰', '🦱', '🦳', '🦲', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🦅', '🦆', '🦢', '🦉', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🦂', '🦟', '🦠', '💐', '🌸', '💮', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘', '🍀', '🍁', '🍂', '🍃', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽', '🍴', '🥄', '🔪', '🏺', '🌍', '🌎', '🌏', '🌐', '🗾', '🧭', '🏔', '⛰', '🌋', '🗻', '🧱', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩', '🕋', '⛲', '⛺', '🌁', '🌃', '🌄', '🌅', '🌆', '🌇', '🌉', '🎠', '🎡', '🎢', '💈', '🎪', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🛵', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🚏', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛶', '🚤', '🚢', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰', '🚀', '🛸', '🧳', '⌛', '⏳', '⌚', '⏰', '⏱', '⏲', '🕰', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '⛅', '🌀', '🌈', '🌂', '☔', '⚡', '⛄', '🔥', '💧', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗', '🎟', '🎫', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🎱', '🔮', '🧿', '🎮', '🎰', '🎲', '🧩', '🧸', '🃏', '🀄', '🎴', '🎭', '🎨', '🧵', '🧶', '👓', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎤', '🎧', '📻', '🎷', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '📱', '📲', '📞', '📟', '📠', '🔋', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞', '📑', '🔖', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '📝', '📁', '📂', '🗂', '📅', '📆', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📏', '📐', '🔒', '🔓', '🔏', '🔐', '🔑', '🔨', '🪓', '🔫', '🏹', '🔧', '🔩', '🦯', '🔗', '🧰', '🧲', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🪑', '🚽', '🚿', '🛁', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🚬', '🗿', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐', '🕎', '🔯', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔀', '🔁', '🔂', '▶', '⏩', '⏭', '⏯', '◀', '⏪', '⏮', '🔼', '⏫', '🔽', '⏬', '⏸', '⏹', '⏺', '⏏', '🎦', '📶', '📳', '📴', '💱', '💲', '🔱', '📛', '🔰', '⭕', '❌', '➰', '➿', '#️⃣', '*️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰', '🆎', '🅱', '🆑', '🆒', '🆓', '🆔', '🆕', '🆖', '🅾', '🆗', '🅿', '🆘', '🆙', '🆚', '🈁', '🈶', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '🈺', '🈵', '🔴', '🟠', '🟡', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟦', '🟪', '🟫', '⬛', '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '🏁', '🚩', '🎌', '🏴', '🏳️‍🌈', '🏴‍☠️', '🏴󠁧󠁢󠁷󠁬󠁳󠁿']

const tasks = div(tw('app-tasks grid gap-2'))
const lines: HTMLButtonElement[] = []

const fireworksLeft = new Audio('/fireworks.mp3')
const fireworksRight = new Audio('/fireworks.mp3')
tasks.append(progress)

const retry = button('Setup credentials', tw('mt-4 hidden'))
retry.addEventListener('click', () => {
  storage.clear('api-base')
  storage.clear('api-key')
  emit('need-credentials')
  retry.classList.toggle('hidden')
})
tasks.append(retry)

function handleError (response: AirtableResponse): void {
  console.error('handle error response', response)
  let message = response.error && response.error.type === 'UNAUTHORIZED' ? 'The credentials you provided does not work' : 'Failed to fetch data from Airtable'
  message += ', click the button below to try again.'
  state.statusError = message
  retry.classList.toggle('hidden')
}

on('get-tasks-error', handleError)

function updateLine (line: HTMLElement, task: AirtableTask): void {
  const isActive = isTaskActive(task)
  if (line.dataset.active === String(isActive)) return
  line.dataset.active = String(isActive)
  line.innerHTML = `${isActive ? pickOne(emojis) : '✔️'}&nbsp; ${task.fields.name}`
  line.classList.toggle('opacity-60', !isActive)
}

function createLine (task: AirtableTask): HTMLButtonElement {
  const line = dom('button', tw('app-task mr-auto -ml-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-start transition-transform duration-300 ease-out'), task.fields.name)
  line.dataset.taskId = task.id
  updateLine(line, task)
  lines.push(line)
  return line
}

// eslint-disable-next-line max-params
async function throwConfetti (x: number, y: number, angle: number, sound: HTMLAudioElement): Promise<void> { // eslint-disable-line id-length
  void sound.play()
  void confetti({ angle, origin: { x, y } }) // eslint-disable-line id-length
  await sleep(Nb.Two * Nb.Hundred)
}

async function throwConfettiAround (element: HTMLElement): Promise<void> {
  /* eslint-disable @typescript-eslint/no-magic-numbers */
  const { bottom, left, right } = element.getBoundingClientRect()
  const delta = window.innerWidth < 450 ? 90 : 30
  const positionY = Math.round(bottom / window.innerHeight * 100) / 100
  let positionX = Math.round((left + delta) / window.innerWidth * 100) / 100
  const angle = 20
  await throwConfetti(positionX, positionY, 90 + angle, fireworksLeft)
  positionX = Math.round((right - delta) / window.innerWidth * 100) / 100
  await throwConfetti(positionX, positionY, 90 - angle, fireworksRight)
  /* eslint-enable @typescript-eslint/no-magic-numbers */
}

async function visuallyToggleComplete (line: HTMLElement, task: AirtableTask): Promise<boolean> {
  line.classList.add('scale-125')
  const hasBeenUpdated = await toggleComplete(task)
  line.classList.remove('scale-125')
  return hasBeenUpdated
}

function getTaskFromElement (element: HTMLElement | null, list: AirtableTask[]): AirtableTask | undefined {
  if (element === null || element.dataset.taskId === undefined) return
  const task = list.find(t => t.id === element.dataset.taskId)
  if (task === undefined) console.error('failed to find this task in list')
  // eslint-disable-next-line consistent-return
  return task
}

async function onClick (line: HTMLElement | null, list: AirtableTask[]): Promise<void> {
  const task = getTaskFromElement(line, list)
  if (task === undefined || line === null) return
  const hasBeenUpdated = await visuallyToggleComplete(line, task)
  if (!hasBeenUpdated) { console.error('failed to update this task'); return }
  if (!isTaskActive(task)) void throwConfettiAround(line)
  state.tasks = state.tasks.map(t => (t.id === task.id ? task : t))
  updateLine(line, task)
}

function updateList (list: AirtableTask[]): void {
  if (list.length === 0) { console.log('no task list to display'); return }
  console.log('update list...')
  const processed: string[] = []
  lines.forEach(line => {
    const task = list.find(t => (t.id === line.dataset.taskId))
    if (task === undefined) line.remove() // deleting a task in dom that does not exists on Airtable
    else {
      processed.push(task.id)
      updateLine(line, task)
    }
  })
  const missing = list.filter(t => !processed.includes(t.id)) // exists on Airtable but not in dom
  if (missing.length > 0) console.log('missing tasks', missing)
  missing.forEach(task => { tasks.append(createLine(task)) })
}

watch('tasks', () => { updateList(state.tasks) })

watch('isSetup', () => { if (state.isSetup && state.tasks.length > 0) updateList(state.tasks) })

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
tasks.addEventListener('click', (event: Event) => { void onClick(event.target as HTMLElement, state.tasks) })

export { tasks }
