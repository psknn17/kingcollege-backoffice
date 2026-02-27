import { useState, useMemo } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { Search, Plus, Edit, Trash2, Building2 } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

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

  const [clients, setClients] = usePersistedState<Client[]>("clientList", [])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, "id" | "createdAt">>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return clients.filter(
      c =>
        c.clientName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    )
  }, [clients, searchTerm])

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

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
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
            {userCanEdit && (
              <Button onClick={openAdd} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            )}
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
                  filtered.map((client, idx) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-left text-muted-foreground">{idx + 1}</TableCell>
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
    </div>
  )
}
