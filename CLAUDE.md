# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Payment Backoffice System for school administration. A React-based admin panel for managing tuition payments, after-school activities, events, summer programs, discounts, and invoices.

## Development Commands

```bash
npm i          # Install dependencies
npm run dev    # Start development server (port 3000, auto-opens browser)
npm run build  # Production build (outputs to /build)
```

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Styling**: Tailwind CSS with `class-variance-authority` for variants
- **Charts**: Recharts
- **Forms**: react-hook-form
- **Notifications**: Sonner (toast notifications)

## Architecture

### Entry Points
- `src/main.tsx` - React root render
- `src/App.tsx` - Main application with sidebar navigation and routing

### Navigation Structure
The app uses a state-based routing pattern (not React Router). Navigation is managed through:
- `activeSection` state for current page
- `subPageHistory` array for back navigation
- `navigateToSubPage()` and `navigateBack()` functions

Six main sections in the sidebar:
1. **Tuition Management** - Dashboard, term settings, debt reminders, payment history, transactions
2. **After School** - Dashboard, registration settings, courses, external parents, receipts
3. **Event Management** - Event import, payment deadlines, registration reports, receipts
4. **Summer Activities** - Import, registration control, payment reports, receipts
5. **Discount Management** - Overview, student groups, promotions, waive fees, reports
6. **Invoice Management** - Invoices, items/templates, email jobs

### Component Organization
- `src/components/ui/` - Reusable shadcn/ui components (buttons, dialogs, tables, etc.)
- `src/components/` - Feature components (one per page/section)
- `src/components/figma/` - Design-specific components

### Utilities
- `src/components/ui/utils.ts` - Contains `cn()` function for merging Tailwind classes
- `src/components/ui/use-mobile.ts` - Mobile detection hook

### Path Aliases
The `@/` alias maps to `src/` (configured in vite.config.ts)

## Patterns

### Adding a New Page
1. Create component in `src/components/`
2. Import in `App.tsx`
3. Add to appropriate `menuItems` object with id, label, and icon
4. Add case to `renderContent()` switch statement

### Styling
Use the `cn()` utility for conditional class merging:
```tsx
import { cn } from "@/components/ui/utils"
cn("base-class", condition && "conditional-class")
```

## Workflow Preference

ทุกครั้งที่เริ่มงาน implementation ให้ใช้ workflow นี้เสมอ:

1. **Plan Phase**: เข้า Plan Mode ใช้ Opus model วางแผนก่อน — วิเคราะห์ปัญหา, สำรวจ codebase, เขียนแผนเป็นขั้นตอน
2. **Execute Phase**: หลังแผนผ่านการอนุมัติแล้ว ใช้ builder agent (`subagent_type: "builder"`, `run_in_background: true`) ดำเนินการตามแผน — run in background เสมอ

ห้ามข้าม Plan Mode ไป execute ตรงๆ ต้องวางแผนและให้ user approve ก่อนทุกครั้ง
