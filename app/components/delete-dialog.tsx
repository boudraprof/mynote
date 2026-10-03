import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
// import { Field, FieldGroup } from "@/components/ui/field"

type T = {
  deleteButtonLabel?: string
  conformButtonLabel?: string
  title: string
  children?: React.ReactElement
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined
}

export default function DeleteDialog({
  onClick,
  children,
  deleteButtonLabel,
  conformButtonLabel,
  title,
}: T) {
  return (
    <Dialog>
      <div>
        <DialogTrigger asChild>
          <Button variant="destructive" className="hover:bg-destructive/80!">
            {deleteButtonLabel || 'Delete'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm z-9999">
          <DialogHeader>
            <DialogTitle className="text-sm">{title}</DialogTitle>
          </DialogHeader>
          {children}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                name="delete"
                // className="bg-secondary"
                variant="destructive"
                onClick={onClick}
                type="submit"
              >
                {conformButtonLabel || 'Conform'}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  )
}
