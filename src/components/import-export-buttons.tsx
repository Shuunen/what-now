import { DownloadIcon, UploadIcon } from 'lucide-react'
import { type ChangeEvent, useRef } from 'react'
import { safeImportJson } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { toastError, toastSuccess } from '../store/use-toast-store'
import { downloadFile } from '../utils/download-file.utils'
import { exportFilename, exportJson } from '../utils/import-export.utils'
import { Button } from './ui/button'

function handleExport() {
  const blob = new Blob([exportJson(useAppStore.getState().data)], { type: 'application/json' })
  downloadFile(blob, exportFilename())
  toastSuccess('Data exported')
}

export function ImportExportButtons() {
  const hasTasks = useAppStore(state => state.data.tasks.length > 0)
  const loadData = useAppStore(state => state.loadData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const text = reader.result
      /* v8 ignore next -- readAsText always yields a string on success */
      if (typeof text !== 'string') return
      const result = safeImportJson(text)
      if ('error' in result) toastError(result.error)
      else {
        loadData(result.data)
        toastSuccess('Data imported')
      }
    })
    reader.readAsText(file, 'utf8')
  }

  return (
    <div className="flex gap-3" data-testid="import-export">
      <input accept=".json,application/json" className="hidden" data-testid="file-input" onChange={handleFileChange} ref={fileInputRef} type="file" />
      <Button name="import" onClick={handleImportClick} variant="outline">
        <UploadIcon className="size-4" />
        Import
      </Button>
      <Button disabled={!hasTasks} name="export" onClick={handleExport} variant="outline">
        <DownloadIcon className="size-4" />
        Export
      </Button>
    </div>
  )
}
