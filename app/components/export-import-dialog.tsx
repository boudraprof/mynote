"use client"

import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  downloadFile,
  exportNotes,
  getExportFilename,
  importNotes,
} from '@/utils/export-import'
import logger from '@/utils/logger'

type ExportFormat = 'json' | 'markdown' | 'csv'

export function ExportImportDialog() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true)
    try {
      const data = await exportNotes({ format })
      const filename = getExportFilename(format)

      const mimeTypes = {
        json: 'application/json',
        markdown: 'text/markdown',
        csv: 'text/csv',
      }

      downloadFile(data, filename, mimeTypes[format])
      toast.success(`Notes exported as ${format.toUpperCase()}`)
      setOpen(false)
    } catch (error) {
      logger.error('Export failed', error, 'Export')
      toast.error('Failed to export notes')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const result = await importNotes(file)

      if (result.success > 0) {
        toast.success(`Imported ${result.success} notes`)
      }
      if (result.failed > 0) {
        toast.warning(`Failed to import ${result.failed} notes`)
      }

      setOpen(false)
    } catch (error) {
      logger.error('Import failed', error, 'Import')
      toast.error('Failed to import notes')
    } finally {
      setIsImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Export / Import">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export & Import Notes</DialogTitle>
          <DialogDescription>
            Export your notes or import from a backup file.
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'export' ? 'default' : 'outline'}
            onClick={() => setActiveTab('export')}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant={activeTab === 'import' ? 'default' : 'outline'}
            onClick={() => setActiveTab('import')}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>

        {/* Export options */}
        {activeTab === 'export' && (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Download all your notes in your preferred format.
            </p>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => void handleExport('json')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div>JSON</div>
                <div className="text-xs text-muted-foreground">
                  Full backup, can be re-imported
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => void handleExport('markdown')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div>Markdown</div>
                <div className="text-xs text-muted-foreground">
                  Human-readable, for documentation
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => void handleExport('csv')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div>CSV</div>
                <div className="text-xs text-muted-foreground">
                  Spreadsheet compatible
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Import options */}
        {activeTab === 'import' && (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Import notes from a JSON backup file.
            </p>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm mb-2">
                {isImporting ? 'Importing...' : 'Drop a file or click to browse'}
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => void handleImport(e)}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {isImporting && (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Only JSON files exported from this app can be imported.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
