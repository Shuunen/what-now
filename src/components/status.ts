import { div, text, tw } from 'shuutils'
import { state, watch } from '../state'

const error = text(tw('app-error font-bold text-red-500'), state.statusError)
watch('statusError', () => { error.innerHTML = state.statusError })

const info = text('info', state.statusInfo)
watch('statusInfo', () => { info.innerHTML = state.statusInfo })

const progress = text(tw('app-progress text-2xl font-light italic'), state.statusProgress)
watch('statusProgress', () => { progress.innerHTML = state.statusProgress })

const status = div(tw('app-status flex flex-col'))

status.append(error, info, progress)

export { status }
