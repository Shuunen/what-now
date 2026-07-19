import { Route, Routes, useLocation } from 'react-router-dom'
import { PageAbout } from '../pages/page-about'
import { PageAddTask } from '../pages/page-add-task'
import { PageKitchenSink } from '../pages/page-kitchen-sink'
import { PagePlanner } from '../pages/page-planner'
import { PageSettings } from '../pages/page-settings'
import { PageTasks } from '../pages/page-tasks'

// Routes wrapped in a container that replays an enter animation on every navigation, keyed by pathname.
export function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div className="flex grow flex-col motion-safe:animate-in motion-safe:duration-500 motion-safe:ease-out motion-safe:fade-in motion-safe:slide-in-from-bottom-4" data-testid="page-transition" key={location.pathname}>
      <Routes location={location}>
        <Route element={<PageTasks />} path="/" />
        <Route element={<PageAddTask />} path="/add-task" />
        <Route element={<PagePlanner />} path="/planner" />
        <Route element={<PageSettings />} path="/settings" />
        <Route element={<PageAbout />} path="/about" />
        <Route element={<PageKitchenSink />} path="/kitchen-sink" />
      </Routes>
    </div>
  )
}
