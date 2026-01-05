import * as React from "react"
import { cn } from "./utils"
import { Button } from "./button"
import {
  AlertCircle,
  AlertTriangle,
  FileX,
  Inbox,
  RefreshCw,
  Search,
  ServerOff,
  WifiOff,
  FolderOpen,
  Users,
  FileText,
  Calendar,
  CreditCard
} from "lucide-react"

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Preset Empty States
export function EmptySearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-muted-foreground" />}
      title="No results found"
      description="Try adjusting your search or filter criteria to find what you're looking for."
      action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
    />
  )
}

export function EmptyDataState({ type = "items", onCreate }: { type?: string; onCreate?: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    items: <FolderOpen className="h-8 w-8 text-muted-foreground" />,
    students: <Users className="h-8 w-8 text-muted-foreground" />,
    invoices: <FileText className="h-8 w-8 text-muted-foreground" />,
    events: <Calendar className="h-8 w-8 text-muted-foreground" />,
    payments: <CreditCard className="h-8 w-8 text-muted-foreground" />
  }

  return (
    <EmptyState
      icon={icons[type] || icons.items}
      title={`No ${type} yet`}
      description={`Get started by creating your first ${type.slice(0, -1)}.`}
      action={onCreate ? { label: `Create ${type.slice(0, -1)}`, onClick: onCreate } : undefined}
    />
  )
}

// Error State Component
interface ErrorStateProps {
  title?: string
  description?: string
  error?: Error | string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading the data.",
  error,
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-2">{description}</p>
      {error && (
        <p className="text-xs text-destructive/80 max-w-sm mb-4 font-mono">
          {typeof error === "string" ? error : error.message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

// Connection Error
export function ConnectionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection failed"
      description="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
    />
  )
}

// Server Error
export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-orange-100 p-4 mb-4">
        <ServerOff className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Server unavailable</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        The server is temporarily unavailable. Please try again later.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}

// Offline Banner
interface OfflineBannerProps {
  visible: boolean
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      You are currently offline. Some features may be unavailable.
    </div>
  )
}

// Warning Banner
interface WarningBannerProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

export function WarningBanner({ message, action, onDismiss }: WarningBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          {action.label}
        </Button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-700 shrink-0"
        >
          ×
        </button>
      )}
    </div>
  )
}

// Info Banner
interface InfoBannerProps {
  message: string
  className?: string
}

export function InfoBanner({ message, className }: InfoBannerProps) {
  return (
    <div className={cn(
      "bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-3",
      className
    )}>
      <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// Not Found State
export function NotFoundState({ type = "page" }: { type?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{type} not found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        The {type} you're looking for doesn't exist or has been removed.
      </p>
    </div>
  )
}

// No Permission State
export function NoPermissionState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Access denied</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        You don't have permission to view this content. Contact your administrator if you think this is a mistake.
      </p>
    </div>
  )
}
