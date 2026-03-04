import { useState, useMemo } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { Search, Plus, Edit, Trash2, Building2, Upload, Download } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { downloadAsXlsx, parseXlsxOrCsvFile, XLSX_ACCEPT } from "@/utils/xlsxUtils"
import { format } from "date-fns"
import { PaginationBar } from "./ui/pagination-bar"

export interface Client {
  id: string
  clientName: string
  contactName: string
  address: string
  createdAt: string
}

const emptyForm: Omit<Client, "id" | "createdAt"> = {
  clientName: "",
  contactName: "",
  address: "",
}

export function ClientList() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const confirmDialog = useConfirmDialog()
  const importConfirmDialog = useConfirmDialog()

  const [clients, setClients] = usePersistedState<Client[]>("clientList", [])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, "id" | "createdAt">>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([])
  const [importError, setImportError] = useState("")
  const [showAllPreview, setShowAllPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return clients.filter(
      c =>
        c.clientName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    )
  }, [clients, searchTerm])

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const openAdd = () => {
    setEditingClient(null)
    setForm(emptyForm)
    setErrors({})
    setIsDialogOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setForm({ clientName: client.clientName, contactName: client.contactName, address: client.address })
    setErrors({})
    setIsDialogOpen(true)
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!form.clientName.trim()) errs.clientName = "Client name is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingClient) {
      setClients(prev =>
        prev.map(c => c.id === editingClient.id ? { ...c, ...form } : c)
      )
      toast.success("Client updated")
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        ...form,
        createdAt: new Date().toISOString(),
      }
      setClients(prev => [...prev, newClient])
      toast.success("Client added")
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (client: Client) => {
    confirmDialog.confirm(() => {
      setClients(prev => prev.filter(c => c.id !== client.id))
      toast.success("Client deleted")
    })
  }

  // --- Export ---
  const handleExport = () => {
    const headers = ["Client Name", "Contact Name", "Address", "Created At"]
    const rows = filtered.map(c => [
      c.clientName,
      c.contactName,
      c.address,
      c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy HH:mm") : "",
    ])
    downloadAsXlsx(headers, rows, `clients_export_${format(new Date(), "yyyyMMdd_HHmmss")}`)
    toast.success(`Exported ${filtered.length} clients to Excel`)
  }

  // --- Import ---
  const handleImport = () => {
    setImportPreview([])
    setImportError("")
    setShowAllPreview(false)
    setIsImportDialogOpen(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rows = await parseXlsxOrCsvFile(file)
      if (rows.length === 0) {
        setImportError("File has no data rows")
        return
      }

      const fileHeaders = Object.keys(rows[0])
      const hasClientName = fileHeaders.includes("Client Name")

      if (!hasClientName) {
        setImportError(`Missing required column: Client Name. Found: ${fileHeaders.join(", ")}`)
        return
      }

      setImportPreview(rows)
      setImportError("")
      setShowAllPreview(false)
    } catch {
      setImportError("Failed to parse file. Please use the provided template.")
    }
  }

  const performConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error("No data to import")
      return
    }

    let imported = 0
    let duplicates = 0

    importPreview.forEach(row => {
      const clientName = (row["Client Name"] || "").trim()
      if (!clientName) return

      const existing = clients.find(c => c.clientName.toLowerCase() === clientName.toLowerCase())
      if (existing) {
        duplicates++
        return
      }

      const newClient: Client = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName,
        contactName: (row["Contact Name"] || "").trim(),
        address: (row["Address"] || "").trim(),
        createdAt: new Date().toISOString(),
      }
      setClients(prev => [...prev, newClient])
      imported++
    })

    setIsImportDialogOpen(false)
    toast.success(`Imported ${imported} clients${duplicates > 0 ? `, skipped ${duplicates} duplicates` : ""}`)
  }

  const handleConfirmImport = () => {
    importConfirmDialog.confirm(() => {
      performConfirmImport()
    })
  }

  const downloadTemplate = () => {
    const headers = ["Client Name", "Contact Name", "Address"]
    const exampleRow = ["ABC Company Ltd.", "Mr. John Smith", "123 Main Street, Bangkok 10110"]
    downloadAsXlsx(headers, [exampleRow], "client_import_template")
    toast.success("Template downloaded")
  }

  // Check for duplicates in preview
  const duplicateNames = useMemo(() => {
    const existingNames = new Set(clients.map(c => c.clientName.toLowerCase()))
    return new Set(
      importPreview
        .map(row => (row["Client Name"] || "").trim().toLowerCase())
        .filter(name => name && existingNames.has(name))
    )
  }, [importPreview, clients])

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        onConfirm={confirmDialog.handleConfirm}
        titleKey="Delete Client"
        descriptionKey="Are you sure you want to delete this client? This action cannot be undone."
      />
      <ConfirmDialog
        open={importConfirmDialog.isOpen}
        onOpenChange={importConfirmDialog.setIsOpen}
        onConfirm={importConfirmDialog.handleConfirm}
        titleKey="Confirm Import"
        descriptionKey={`Import ${importPreview.length} clients? ${duplicateNames.size > 0 ? `${duplicateNames.size} duplicate(s) will be skipped.` : ""}`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t("menu.clientList")}
              </CardTitle>
              <CardDescription>Manage external clients for invoice creation</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {userCanEdit && (
                <Button variant="outline" onClick={handleImport} className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
              )}
              <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              {userCanEdit && (
                <Button onClick={openAdd} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Client
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">#</TableHead>
                  <TableHead className="text-left">Client Name</TableHead>
                  <TableHead className="text-left">Contact Name</TableHead>
                  <TableHead className="text-left">Address</TableHead>
                  {userCanEdit && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userCanEdit ? 5 : 4} className="text-center py-12 text-muted-foreground">
                      {searchTerm ? "No clients match your search" : "No clients yet. Click \"Add Client\" to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClients.map((client, idx) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-left text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="text-left font-medium">{client.clientName}</TableCell>
                      <TableCell className="text-left">{client.contactName || "-"}</TableCell>
                      <TableCell className="text-left">{client.address || "-"}</TableCell>
                      {userCanEdit && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(client)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
          <p className="text-sm text-muted-foreground">
            {filtered.length} / {clients.length} clients
          </p>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: "720px", width: "100%", padding: "24px" }}>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", width: "100%", marginTop: "0px" }}>
            {/* Client Name */}
            <div className="space-y-1.5">
              <Label>
                Client name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Company or individual name"
                value={form.clientName}
                onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                className={errors.clientName ? "border-red-500" : ""}
                autoComplete="off"
              />
              {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
            </div>

            {/* Contact Name */}
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input
                placeholder="Mr./Mrs. Contact Person"
                value={form.contactName}
                onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
                autoComplete="off"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                placeholder="Full address"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingClient ? "Save Changes" : "Add Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl w-[90vw] flex flex-col max-h-[90vh] p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Import Clients</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file to import clients. Download the template for the correct format.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Excel Template</p>
                <p className="text-sm text-muted-foreground">Download the template with correct column headers</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="clientImportFile">Upload File</Label>
              <Input
                id="clientImportFile"
                type="file"
                accept={XLSX_ACCEPT}
                onChange={handleFileUpload}
                className="cursor-pointer"
                disabled={!userCanEdit}
              />
            </div>

            {/* Error Display */}
            {importError && (
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            {/* Duplicate Warning */}
            {importPreview.length > 0 && duplicateNames.size > 0 && (
              <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                {duplicateNames.size} client(s) already exist and will be skipped: {Array.from(duplicateNames).join(", ")}
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({importPreview.length} clients)</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[480px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Client Name</TableHead>
                        <TableHead className="text-left">Contact Name</TableHead>
                        <TableHead className="text-left">Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllPreview ? importPreview : importPreview.slice(0, 10)).map((row, index) => {
                        const isDuplicate = duplicateNames.has((row["Client Name"] || "").trim().toLowerCase())
                        return (
                          <TableRow key={index} className={isDuplicate ? "bg-yellow-50" : ""}>
                            <TableCell className="text-left font-medium">
                              {row["Client Name"] || ""}
                              {isDuplicate && <span className="ml-2 text-xs text-yellow-600">(duplicate)</span>}
                            </TableCell>
                            <TableCell className="text-left">{row["Contact Name"] || "-"}</TableCell>
                            <TableCell className="text-left">{row["Address"] || "-"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {importPreview.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAllPreview(!showAllPreview)}
                  >
                    {showAllPreview
                      ? "Show less"
                      : `Show ${importPreview.length - 10} more`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="p-6 pt-4 border-t flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!userCanEdit || importPreview.length === 0 || !!importError}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {importPreview.length > 0 ? `${importPreview.length} Clients` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
