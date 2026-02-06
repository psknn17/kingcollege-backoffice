import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  titleKey?: string
  descriptionKey?: string
  confirmTextKey?: string
  cancelTextKey?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  titleKey = "confirmDialog.saveTitle",
  descriptionKey = "confirmDialog.saveDescription",
  confirmTextKey = "common.save",
  cancelTextKey = "common.cancel",
  variant = "default"
}: ConfirmDialogProps) {
  const { t } = useLanguage()

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{t(descriptionKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t(cancelTextKey)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {t(confirmTextKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
