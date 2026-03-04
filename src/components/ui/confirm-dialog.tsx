"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  /** The element that opens the dialog */
  trigger: React.ReactNode
  /** Dialog title */
  title: string
  /** Dialog description / body text */
  description: string
  /** Label for the confirm button (default: "Continue") */
  confirmLabel?: string
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string
  /** Callback fired when the user confirms */
  onConfirm: () => void
  /** Visual style of the confirm button (default: "default") */
  variant?: "default" | "destructive"
  /** Disable the confirm button (e.g. while an action is in flight) */
  disabled?: boolean
}

/**
 * A styled confirmation dialog built on Radix AlertDialog.
 *
 * Replaces browser `confirm()` with an accessible, themed dialog
 * that matches the rest of the UI.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  disabled = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={disabled}
            className={cn(
              variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Controlled variant for programmatic open/close ─────────────────────────

interface ControlledConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description / body text */
  description: string
  /** Label for the confirm button (default: "Continue") */
  confirmLabel?: string
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string
  /** Callback fired when the user confirms */
  onConfirm: () => void
  /** Visual style of the confirm button (default: "default") */
  variant?: "default" | "destructive"
  /** Disable the confirm button */
  disabled?: boolean
}

/**
 * A controlled confirmation dialog for cases where the trigger is not
 * a simple button (e.g. fired from a callback or event handler).
 */
export function ControlledConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  disabled = false,
}: ControlledConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={disabled}
            className={cn(
              variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
