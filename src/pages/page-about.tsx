import { Link } from 'react-router-dom'
import { FloatingMenu } from '../components/floating-menu'
import { useActions } from '../utils/pages.utils'

export function PageAbout() {
  const actions = useActions()
  return (
    <div className="flex grow flex-col justify-center gap-4 text-center" data-testid="page-about">
      <h1 className="mb-4">About</h1>
      <p>
        This webapp has been deployed from this open-source code{' '}
        <a className="border-b" data-testid="link-github" href="https://github.com/Shuunen/what-now" rel="noopener noreferrer" target="_blank">
          on Github
        </a>
        .
      </p>
      <p>Please check the above link to be introduced to this app : what is it and how to use it.</p>
      <p>
        Curious about the UI components ? Check out the{' '}
        <Link className="border-b" data-testid="link-kitchen-sink" to="/kitchen-sink">
          kitchen sink
        </Link>
        .
      </p>
      <small>__unique-mark__</small>
      <FloatingMenu actions={actions} />
    </div>
  )
}
