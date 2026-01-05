import * as React from "react"
import { cn } from "./utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Badge } from "./badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { Calendar } from "./calendar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  RotateCcw
} from "lucide-react"
import { format } from "date-fns"

// Types
export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  id: string
  label: string
  type: "select" | "multiselect" | "date" | "daterange" | "text" | "number"
  options?: FilterOption[]
  placeholder?: string
}

export interface FilterValues {
  [key: string]: string | string[] | Date | { from?: Date; to?: Date } | undefined
}

// Search Input with icon
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = "Search...", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Filter Panel
interface AdvancedFilterProps {
  filters: FilterConfig[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onReset?: () => void
  onApply?: () => void
  className?: string
}

export function AdvancedFilter({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  className
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const activeFilterCount = Object.values(values).filter(v => {
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "object" && v !== null) {
      return "from" in v ? v.from || v.to : true
    }
    return v !== undefined && v !== ""
  }).length

  const handleFilterChange = (id: string, value: any) => {
    onChange({ ...values, [id]: value })
  }

  const handleReset = () => {
    const resetValues: FilterValues = {}
    filters.forEach(f => {
      resetValues[f.id] = f.type === "multiselect" ? [] : undefined
    })
    onChange(resetValues)
    onReset?.()
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-1.5">
                <Label className="text-xs font-medium">{filter.label}</Label>
                {renderFilterInput(filter, values[filter.id], (value) => handleFilterChange(filter.id, value))}
              </div>
            ))}
          </div>

          {onApply && (
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={onApply}>
                Apply Filters
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && !isOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const value = values[filter.id]
            if (!value || (Array.isArray(value) && value.length === 0)) return null

            return (
              <Badge
                key={filter.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <span className="text-muted-foreground">{filter.label}:</span>
                <span>{formatFilterValue(filter, value)}</span>
                <button
                  onClick={() => handleFilterChange(filter.id, filter.type === "multiselect" ? [] : undefined)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

function renderFilterInput(
  filter: FilterConfig,
  value: any,
  onChange: (value: any) => void
) {
  switch (filter.type) {
    case "select":
      return (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={filter.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "multiselect":
      const selectedValues = value || []
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start h-9 font-normal">
              {selectedValues.length > 0 ? (
                <span>{selectedValues.length} selected</span>
              ) : (
                <span className="text-muted-foreground">{filter.placeholder || "Select..."}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <div className="space-y-1">
              {filter.options?.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selectedValues, option.value])
                      } else {
                        onChange(selectedValues.filter((v: string) => v !== option.value))
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start h-9 font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PP") : filter.placeholder || "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={onChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )

    case "daterange":
      const dateRange = value || {}
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start h-9 font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                filter.placeholder || "Pick dates"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onChange}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )

    case "text":
      return (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={filter.placeholder}
          className="h-9"
        />
      )

    case "number":
      return (
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={filter.placeholder}
          className="h-9"
        />
      )

    default:
      return null
  }
}

function formatFilterValue(filter: FilterConfig, value: any): string {
  if (Array.isArray(value)) {
    return value.map(v => filter.options?.find(o => o.value === v)?.label || v).join(", ")
  }
  if (filter.type === "date" && value instanceof Date) {
    return format(value, "PP")
  }
  if (filter.type === "daterange" && typeof value === "object") {
    const range = value as { from?: Date; to?: Date }
    if (range.from && range.to) {
      return `${format(range.from, "MM/dd")} - ${format(range.to, "MM/dd")}`
    }
    if (range.from) return format(range.from, "PP")
  }
  if (filter.type === "select") {
    return filter.options?.find(o => o.value === value)?.label || value
  }
  return String(value)
}

// Quick Filter Buttons
interface QuickFilterProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function QuickFilter({ options, value, onChange, className }: QuickFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className="h-8"
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
