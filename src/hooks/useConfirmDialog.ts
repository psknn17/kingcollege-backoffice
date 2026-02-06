import { useState } from "react"

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const confirm = (action: () => void) => {
    setPendingAction(() => action)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction()
    }
    setIsOpen(false)
    setPendingAction(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    setPendingAction(null)
  }

  return {
    isOpen,
    setIsOpen,
    confirm,
    handleConfirm,
    handleCancel
  }
}
