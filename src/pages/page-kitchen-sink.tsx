import type { ReactNode } from 'react'
import { nbPercentMax } from 'shuutils'
import { CheckmarkIcon } from '../components/icons/checkmark-icon'
import { Status } from '../components/status'
import { Button } from '../components/ui/button'
import { Command } from '../components/ui/command'
import { CommandEmpty } from '../components/ui/command-empty'
import { CommandItem } from '../components/ui/command-item'
import { CommandList } from '../components/ui/command-list'
import { progressAccentColor } from '../utils/progress.utils'

const baseColors = [
  { name: 'primary', token: '--color-primary' },
  { name: 'success', token: '--color-success' },
  { name: 'ok', token: '--color-ok' },
  { name: 'warning', token: '--color-warning' },
  { name: 'bad', token: '--color-bad' },
  { name: 'error', token: '--color-error' },
  { name: 'white', token: '--color-white' },
] as const

const buttonVariants = ['default', 'success', 'error', 'outline', 'ghost'] as const
const buttonSizes = ['sm', 'default', 'lg', 'icon'] as const

function colorSwatch(label: string, background: string, key: string) {
  return (
    <div className="flex flex-col items-center gap-1.5" key={key}>
      <div className="size-14 rounded-full border border-white/20" style={{ background }} />
      <span className="font-mono text-xs text-white/60">{label}</span>
    </div>
  )
}

function colorsSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">{baseColors.map(color => colorSwatch(color.name, `var(${color.token})`, color.name))}</div>
    </div>
  )
}

function buttonsSection() {
  return (
    <div className="flex flex-col gap-4">
      {buttonVariants.map(variant => (
        <div className="flex flex-wrap items-center gap-3" key={variant}>
          <span className="w-16 shrink-0 font-mono text-xs text-white/50">{variant}</span>
          {buttonSizes.map(size => (
            <Button key={size} name={`${variant}-${size}`} size={size} variant={variant}>
              {size === 'icon' ? <CheckmarkIcon /> : size}
            </Button>
          ))}
          <Button disabled name={`${variant}-disabled`} variant={variant}>
            disabled
          </Button>
        </div>
      ))}
    </div>
  )
}

const typeScale = [
  { label: 'h1', sample: 'What now' },
  { label: 'h2', sample: 'A section heading' },
  { label: 'p', sample: 'A short paragraph of regular body text.' },
  { label: 'em', sample: 'Emphasized text' },
  { label: 'small', sample: 'Small informative text' },
]

function typographyRow({ label, sample }: { label: string; sample: string }) {
  if (label === 'small') return <small>{sample}</small>
  if (label === 'em') return <em>{sample}</em>
  if (label === 'h1') return <h1>{sample}</h1>
  if (label === 'h2') return <h2>{sample}</h2>
  return <p>{sample}</p>
}

function typographySection() {
  return (
    <div className="flex flex-col gap-4">
      {typeScale.map(row => (
        <div className="flex items-center gap-6 border-b border-white/10 pb-3" key={row.label}>
          <span className="w-16 shrink-0 font-mono text-xs text-white/50">{row.label}</span>
          {typographyRow(row)}
        </div>
      ))}
    </div>
  )
}

function taskRow(name: string, isActive: boolean, key: string) {
  const accentColor = progressAccentColor(isActive ? 0 : nbPercentMax)
  return (
    <div className="-ml-2 flex items-center gap-4 pb-3 pl-2 text-start whitespace-nowrap" key={key}>
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isActive ? 'border-2 border-white/30' : ''}`} style={isActive ? undefined : { background: accentColor }}>
        {!isActive && <CheckmarkIcon className="text-black" />}
      </span>
      <span className={`max-w-full overflow-hidden text-lg leading-none font-medium text-ellipsis ${isActive ? '' : 'relative inline-block text-white/50'}`}>
        {name}
        {!isActive && <span aria-hidden="true" className="absolute top-1/2 left-0 h-[2.4px] w-full -translate-y-1/2 rounded-sm" style={{ background: accentColor }} />}
      </span>
    </div>
  )
}

function tasksSection() {
  return (
    <div className="grid gap-1">
      {taskRow('An active task, ready to be done', true, 'active')}
      {taskRow('A completed task, struck through', false, 'done')}
    </div>
  )
}

function statusSection() {
  return (
    <div className="flex flex-col gap-6">
      <Status error="Something went wrong" />
      <Status info="Heads up, here is some info" />
      <Status progress="Halfway to heaven" />
    </div>
  )
}

function commandSection() {
  return (
    <Command className="w-72 border border-white/10">
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandItem className="cursor-pointer">Tasks</CommandItem>
        <CommandItem className="cursor-pointer">Planner</CommandItem>
        <CommandItem className="cursor-pointer" disabled>
          Settings (disabled)
        </CommandItem>
      </CommandList>
    </Command>
  )
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h2>{title}</h2>
      {children}
      <div className="mx-auto my-4 w-1/2 border-b border-white/10" />
    </div>
  )
}

// oxlint-disable-next-line react/no-multi-comp
export function PageKitchenSink() {
  return (
    <div className="flex grow flex-col gap-8 py-12" data-testid="page-kitchen-sink">
      <h1 className="text-4xl!">Kitchen Sink</h1>
      <Section title="Typography">{typographySection()}</Section>
      <Section title="Colors">{colorsSection()}</Section>
      <Section title="Buttons">{buttonsSection()}</Section>
      <Section title="Tasks">{tasksSection()}</Section>
      <Section title="Status">{statusSection()}</Section>
      <Section title="Command menu">{commandSection()}</Section>
    </div>
  )
}
