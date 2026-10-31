import { useUIStore } from '@/stores/uiStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog() {
  const { confirmDialog, closeConfirm } = useUIStore()

  const handleConfirm = () => {
    confirmDialog.onConfirm()
    closeConfirm()
  }

  return (
    <Dialog open={confirmDialog.open} onOpenChange={open => !open && closeConfirm()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {confirmDialog.destructive && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
            )}
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2">
            {confirmDialog.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            variant={confirmDialog.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {confirmDialog.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
