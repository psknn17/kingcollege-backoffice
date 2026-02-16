# Table Alignment Standard

## Overview
This document defines the system-wide standard for table header and cell alignment to ensure visual consistency across all 42 table components.

## Alignment Rules

### By Column Type

| Column Type | Alignment | Reason |
|------------|-----------|---------|
| **Text** (Names, Descriptions, IDs) | `left` | Natural reading direction |
| **Numbers** (Quantities, Counts) | `right` | Easier to compare magnitudes |
| **Currency** (Prices, Amounts) | `right` | Align decimal points |
| **Dates** (Created, Updated) | `left` | Text-like content |
| **Status** (Badges, Indicators) | `center` | Visual emphasis |
| **Actions** (Buttons) | `center` | Visual balance |
| **Checkboxes** | `center` | Better UX |
| **Icons** | `center` | Visual alignment |

## Implementation Methods

### Method 1: Using Alignment Props (Recommended)
```tsx
import { TableHead, TableCell } from "@/components/ui/table"

<TableHead align="right">Amount</TableHead>
<TableCell align="right">1,000 THB</TableCell>
```

### Method 2: Using Column Type Helper
```tsx
import { getColumnClass } from "@/utils/tableAlignment"

<TableHead className={getColumnClass("currency")}>Price</TableHead>
<TableCell className={getColumnClass("currency")}>1,500 THB</TableCell>
```

### Method 3: Using Presets
```tsx
import { ColumnPresets } from "@/utils/tableAlignment"

<TableHead className={ColumnPresets.name}>Student Name</TableHead>
<TableCell className={ColumnPresets.name}>John Doe</TableCell>
```

### Method 4: Direct Classes
```tsx
<TableHead className="text-right">Total</TableHead>
<TableCell className="text-right">5,000 THB</TableCell>
```

## Complete Example

```tsx
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { ColumnPresets } from "@/utils/tableAlignment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function StudentTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {/* Checkbox - Center */}
          <TableHead className={ColumnPresets.checkbox}>
            <Checkbox />
          </TableHead>

          {/* ID - Left */}
          <TableHead className={ColumnPresets.id}>Student ID</TableHead>

          {/* Name - Left */}
          <TableHead className={ColumnPresets.name}>Name</TableHead>

          {/* Grade - Left */}
          <TableHead align="left">Grade</TableHead>

          {/* Amount - Right */}
          <TableHead className={ColumnPresets.currency}>Amount</TableHead>

          {/* Status - Center */}
          <TableHead className={ColumnPresets.status}>Status</TableHead>

          {/* Actions - Center */}
          <TableHead className={ColumnPresets.actions}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id}>
            {/* Checkbox - Center */}
            <TableCell className={ColumnPresets.checkbox}>
              <Checkbox />
            </TableCell>

            {/* ID - Left */}
            <TableCell className={ColumnPresets.id}>
              {student.studentId}
            </TableCell>

            {/* Name - Left */}
            <TableCell className={ColumnPresets.name}>
              {student.name}
            </TableCell>

            {/* Grade - Left */}
            <TableCell align="left">
              Year {student.grade}
            </TableCell>

            {/* Amount - Right */}
            <TableCell className={ColumnPresets.currency}>
              {student.amount.toLocaleString()} THB
            </TableCell>

            {/* Status - Center */}
            <TableCell className={ColumnPresets.status}>
              <Badge variant="outline">{student.status}</Badge>
            </TableCell>

            {/* Actions - Center */}
            <TableCell className={ColumnPresets.actions}>
              <Button variant="ghost" size="sm">Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Quick Reference

### Common Patterns

**Student/User Lists:**
```tsx
<TableHead className={ColumnPresets.id}>ID</TableHead>
<TableHead className={ColumnPresets.name}>Name</TableHead>
<TableHead align="left">Grade/Role</TableHead>
<TableHead className={ColumnPresets.status}>Status</TableHead>
<TableHead className={ColumnPresets.actions}>Actions</TableHead>
```

**Financial/Invoice Tables:**
```tsx
<TableHead align="left">Invoice #</TableHead>
<TableHead align="left">Date</TableHead>
<TableHead className={ColumnPresets.name}>Student Name</TableHead>
<TableHead className={ColumnPresets.currency}>Amount</TableHead>
<TableHead className={ColumnPresets.status}>Status</TableHead>
<TableHead className={ColumnPresets.actions}>Actions</TableHead>
```

**Transaction History:**
```tsx
<TableHead align="left">Date</TableHead>
<TableHead align="left">Transaction ID</TableHead>
<TableHead align="left">Description</TableHead>
<TableHead className={ColumnPresets.currency}>Amount</TableHead>
<TableHead className={ColumnPresets.status}>Status</TableHead>
```

## Migration Checklist

When updating existing tables:

1. ✅ **Identify column types** - Determine each column's data type
2. ✅ **Match header alignment** - Apply same alignment to `<TableHead>` and `<TableCell>`
3. ✅ **Use consistent method** - Pick one implementation method per component
4. ✅ **Test visual alignment** - Verify headers align with content
5. ✅ **Check responsiveness** - Ensure alignment works on different screen sizes

## Common Mistakes to Avoid

❌ **Mismatched alignment:**
```tsx
<TableHead className="text-left">Amount</TableHead>
<TableCell className="text-right">1,000</TableCell>  {/* Wrong! */}
```

✅ **Correct alignment:**
```tsx
<TableHead className="text-right">Amount</TableHead>
<TableCell className="text-right">1,000</TableCell>  {/* Correct */}
```

❌ **Left-aligned currency:**
```tsx
<TableHead className="text-left">Price</TableHead>  {/* Wrong! */}
```

✅ **Right-aligned currency:**
```tsx
<TableHead className="text-right">Price</TableHead>  {/* Correct */}
```

## Available Presets

```typescript
ColumnPresets.checkbox      // Center, w-12
ColumnPresets.id           // Left, w-32
ColumnPresets.code         // Left, w-24
ColumnPresets.name         // Left, w-48
ColumnPresets.description  // Left, w-64
ColumnPresets.email        // Left, w-56
ColumnPresets.quantity     // Right, w-24
ColumnPresets.amount       // Right, w-32
ColumnPresets.currency     // Right, w-32
ColumnPresets.percentage   // Right, w-24
ColumnPresets.date         // Left, w-32
ColumnPresets.datetime     // Left, w-40
ColumnPresets.status       // Center, w-32
ColumnPresets.badge        // Center, w-28
ColumnPresets.actions      // Center, w-32
ColumnPresets.actionsWide  // Center, w-40
ColumnPresets.icon         // Center, w-16
```

## Next Steps

Apply this standard to all 42 components with tables. Priority order:

1. **High Traffic Pages** (Invoice Management, Student List, User Management)
2. **Financial Pages** (Payment History, Credit Notes, Receipts)
3. **Settings Pages** (All configuration tables)
4. **Report Pages** (All reporting tables)

## Support

For questions or clarifications about alignment standards, refer to:
- `/src/utils/tableAlignment.ts` - Core utilities
- `/src/components/ui/table.tsx` - Base components
- This document - Standards and examples
