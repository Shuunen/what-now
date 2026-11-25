import { LoaderCircleIcon, type LucideProps, MaximizeIcon, MenuIcon, MinimizeIcon, XIcon } from 'lucide-react'
import { createElement, type ForwardRefExoticComponent, type RefAttributes, useEffect, useMemo, useRef, useState } from 'react'
import { useFullscreen } from '../hooks/use-fullscreen'
import { testIdFromProps } from '../utils/form.utils'
import { cn } from '../utils/styles.utils'
import { Command } from './ui/command'
import { CommandEmpty } from './ui/command-empty'
import { CommandItem } from './ui/command-item'
import { CommandList } from './ui/command-list'
import { Popover } from './ui/popover'
import { PopoverContent } from './ui/popover-content'
import { PopoverTrigger } from './ui/popover-trigger'

const hoverCloseDelayMs = 150

export type FloatingMenuAction = {
  disabled?: boolean
  handleClick: () => void
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
  name: string
}

/**
 * The menu item that toggles fullscreen.
 * @param onChosen - called when the item is chosen, to close the menu
 * @returns the menu action
 */
function useFullscreenAction(onChosen: () => void): FloatingMenuAction {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen()
  return {
    disabled: !isSupported,
    handleClick: () => {
      onChosen()
      void toggleFullscreen()
    },
    icon: isFullscreen ? MinimizeIcon : MaximizeIcon,
    name: 'Fullscreen',
  }
}

export function FloatingMenu({ actions, isLoading = false, isSettingsRequired = false }: Readonly<{ actions: FloatingMenuAction[]; isLoading?: boolean; isSettingsRequired?: boolean }>) {
  const [isOpen, setIsOpen] = useState(false)
  // every page gets the fullscreen toggle, after its own navigation actions
  const fullscreenAction = useFullscreenAction(() => setIsOpen(false))
  const allActions = useMemo<FloatingMenuAction[]>(() => [...actions, fullscreenAction], [actions, fullscreenAction])
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const iconOpen = useMemo(() => (isOpen ? <XIcon /> : <MenuIcon />), [isOpen])
  const icon = useMemo(() => (isLoading ? <LoaderCircleIcon /> : iconOpen), [iconOpen, isLoading])
  function handleHoverStart() {
    clearTimeout(closeTimeoutRef.current)
    setIsOpen(true)
  }
  function handleHoverEnd() {
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), hoverCloseDelayMs)
  }
  useEffect(() => () => clearTimeout(closeTimeoutRef.current), [])
  return (
    <>
      {isOpen && <div className="fixed right-0 bottom-0 z-10 size-full bg-black/20 bg-linear-to-tl" data-component="speed-dial-backdrop" />}
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <div className="fixed right-5 bottom-5 z-20" onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
          <PopoverTrigger className={cn('cursor-pointer rounded-full p-3 text-white transition-opacity', isSettingsRequired ? 'animate-pulse opacity-100' : 'opacity-20 hover:opacity-100')} data-testid="floating-menu-trigger">
            {icon}
          </PopoverTrigger>
          <PopoverContent className="mr-5 mb-2 w-fit p-1" onMouseEnter={handleHoverStart} onMouseLeave={handleHoverEnd}>
            <Command>
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {allActions.map(action => (
                  <CommandItem className="cursor-pointer text-lg" data-testid={testIdFromProps('menu-item', action)} disabled={action.disabled} key={action.name} onSelect={action.handleClick}>
                    {createElement(action.icon, { className: 'size-5' })}
                    {action.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </div>
      </Popover>
    </>
  )
}
