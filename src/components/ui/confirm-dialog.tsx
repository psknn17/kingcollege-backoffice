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

  // Helper function to translate or return plain text
  const getText = (key: string) => {
    // If the translation returns the same key, it means the key doesn't exist
    // In that case, return the key as plain text (useful for fallback)
    const translated = t(key)
    const result = translated === key && !key.includes('.') ? key : translated
    console.log('getText:', { key, translated, result })
    return result
  }

  const confirmText = getText(confirmTextKey)
  const cancelText = getText(cancelTextKey)

  console.log('ConfirmDialog render:', { confirmText, cancelText, variant, open })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getText(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{getText(descriptionKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
