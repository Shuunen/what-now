import { LoaderCircleIcon, type LucideProps, MenuIcon, XIcon } from 'lucide-react'
import { createElement, type ForwardRefExoticComponent, type RefAttributes, useMemo, useState } from 'react'
import { testIdFromProps } from '../utils/form.utils'
import { cn } from '../utils/styles.utils'
import { Command } from './ui/command'
import { CommandEmpty } from './ui/command-empty'
import { CommandItem } from './ui/command-item'
import { CommandList } from './ui/command-list'
import { Popover } from './ui/popover'
import { PopoverContent } from './ui/popover-content'
import { PopoverTrigger } from './ui/popover-trigger'

export type FloatingMenuAction = {
  disabled?: boolean
  handleClick: () => void
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
  name: string
}

export function FloatingMenu({ actions, isLoading = false, isSettingsRequired = false }: Readonly<{ actions: FloatingMenuAction[]; isLoading?: boolean; isSettingsRequired?: boolean }>) {
  const [isOpen, setIsOpen] = useState(false)
  const iconOpen = useMemo(() => (isOpen ? <XIcon /> : <MenuIcon />), [isOpen])
  const icon = useMemo(() => (isLoading ? <LoaderCircleIcon /> : iconOpen), [iconOpen, isLoading])
  const availableActions = useMemo(() => (isSettingsRequired ? actions.filter(action => ['Tasks', 'Settings'].includes(action.name)) : actions), [actions, isSettingsRequired])
  return (
    <>
      {isOpen && <div className="fixed right-0 bottom-0 z-10 size-full bg-black/20 bg-linear-to-tl" data-component="speed-dial-backdrop" />}
      <Popover onOpenChange={setIsOpen}>
        <PopoverTrigger
          className={cn('fixed right-5 bottom-5 z-20 cursor-pointer rounded-full p-3 text-white transition-opacity', isSettingsRequired ? 'animate-pulse opacity-100' : 'opacity-20 hover:opacity-100')}
          data-testid="floating-menu-trigger"
        >
          {icon}
        </PopoverTrigger>
        <PopoverContent className="mr-5 mb-2 w-fit p-1">
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {availableActions.map(action => (
                <CommandItem className="cursor-pointer text-lg" data-testid={testIdFromProps('menu-item', action)} disabled={action.disabled} key={action.name} onSelect={action.handleClick}>
                  {createElement(action.icon, { className: 'size-5' })}
                  {action.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
