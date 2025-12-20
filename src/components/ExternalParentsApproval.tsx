import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Mail, Phone, User, Calendar, AlertTriangle, FileText, MessageSquare, ArrowUpDown } from "lucide-react"
import { Textarea } from "./ui/textarea"
import { format } from "date-fns"
import { toast } from "sonner@2.0.3"

interface ExternalParentApplication {
  id: string
  parentName: string
  email: string
  phone: string
  studentName: string
  studentAge: number
  preferredCourses: string[]
  applicationDate: Date
  status: "pending" | "approved" | "rejected" | "under_review"
  documents: {
    idCard: boolean
    proofOfAddress: boolean
    studentBirthCertificate: boolean
    medicalCertificate: boolean
  }
  notes: string
  reviewedBy?: string
  reviewDate?: Date
  reason?: string
}

const mockApplications: ExternalParentApplication[] = [
  {
    id: "1",
    parentName: "Michael Thompson",
    email: "michael.thompson@gmail.com",
    phone: "+66 81-234-5678",
    studentName: "Emma Thompson",
    studentAge: 8,
    preferredCourses: ["Swimming", "Piano", "English Drama"],
    applicationDate: new Date("2025-08-20"),
    status: "pending",
    documents: {
      idCard: true,
      proofOfAddress: true,
      studentBirthCertificate: true,
      medicalCertificate: false
    },
    notes: "Looking for swimming classes for beginner level. Student has some piano experience."
  },
  {
    id: "2",
    parentName: "Sarah Kim",
    email: "sarah.kim@outlook.com",
    phone: "+66 87-654-3210",
    studentName: "Alex Kim",
    studentAge: 10,
    preferredCourses: ["Football", "Mathematics Tutoring"],
    applicationDate: new Date("2025-08-18"),
    status: "under_review",
    documents: {
      idCard: true,
      proofOfAddress: true,
      studentBirthCertificate: true,
      medicalCertificate: true
    },
    notes: "Student is very active and interested in sports. Need extra math support.",
    reviewedBy: "Admin User",
    reviewDate: new Date("2025-08-19")
  },
  {
    id: "3",
    parentName: "David Wilson",
    email: "d.wilson@yahoo.com",
    phone: "+66 82-345-6789",
    studentName: "Sophie Wilson",
    studentAge: 6,
    preferredCourses: ["Art & Craft", "Ballet", "Chinese Language"],
    applicationDate: new Date("2025-08-15"),
    status: "approved",
    documents: {
      idCard: true,
      proofOfAddress: true,
      studentBirthCertificate: true,
      medicalCertificate: true
    },
    notes: "Student loves creative activities. Parent is very supportive.",
    reviewedBy: "Principal",
    reviewDate: new Date("2025-08-16")
  },
  {
    id: "4",
    parentName: "Lisa Chen",
    email: "lisa.chen@hotmail.com",
    phone: "+66 89-876-5432",
    studentName: "Ryan Chen",
    studentAge: 12,
    preferredCourses: ["Robotics", "Computer Programming"],
    applicationDate: new Date("2025-08-12"),
    status: "rejected",
    documents: {
      idCard: true,
      proofOfAddress: false,
      studentBirthCertificate: true,
      medicalCertificate: true
    },
    notes: "Student is interested in technology and STEM subjects.",
    reviewedBy: "Admin User",
    reviewDate: new Date("2025-08-14"),
    reason: "Incomplete documentation - missing proof of address"
  }
]

export function ExternalParentsApproval() {
  const [applications] = useState<ExternalParentApplication[]>(mockApplications)
  const [filteredApplications, setFilteredApplications] = useState<ExternalParentApplication[]>(mockApplications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<ExternalParentApplication | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | "review" | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedApplications = (appsToSort: ExternalParentApplication[]) => {
    if (!sortColumn) return appsToSort

    return [...appsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "parentName":
          aVal = a.parentName
          bVal = b.parentName
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "studentAge":
          aVal = a.studentAge
          bVal = b.studentAge
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "applicationDate":
          aVal = a.applicationDate.getTime()
          bVal = b.applicationDate.getTime()
          break
        default:
          return 0
      }

      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  const applyFilters = () => {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.phone.includes(searchTerm)
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setFilteredApplications(applications)
  }

  const openApplicationDetail = (application: ExternalParentApplication) => {
    setSelectedApplication(application)
    setIsModalOpen(true)
    setActionType(null)
    setActionReason("")
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedApplication(null)
    setActionType(null)
    setActionReason("")
  }

  const handleAction = (type: "approve" | "reject" | "review") => {
    setActionType(type)
  }

  const confirmAction = () => {
    if (!selectedApplication || !actionType) return

    const actionText = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "moved to review"
    toast.success(`Application for ${selectedApplication.studentName} has been ${actionText}`)
    closeModal()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDocumentStatus = (documents: ExternalParentApplication["documents"]) => {
    const total = Object.keys(documents).length
    const complete = Object.values(documents).filter(Boolean).length
    
    if (complete === total) {
      return <Badge className="bg-green-100 text-green-800">Complete ({complete}/{total})</Badge>
    } else if (complete > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial ({complete}/{total})</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Incomplete ({complete}/{total})</Badge>
    }
  }

  const summaryStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    underReview: applications.filter(a => a.status === "under_review").length
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">External Parents Approval</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve external parent applications for after-school programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Bulk Notifications
          </Button>
          <Button className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.underReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryStats.approved / summaryStats.total) * 100)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Search & Filter
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">Apply</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Input
                  placeholder="Parent name, student name, email, phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredApplications.length} of {applications.length} applications
        </p>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                  <div className="flex items-center gap-1">
                    Parent Information
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    Student Details
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Preferred Courses</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("applicationDate")}>
                  <div className="flex items-center gap-1">
                    Application Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedApplications(filteredApplications).map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{application.parentName}</div>
                      <div className="text-sm text-muted-foreground">{application.email}</div>
                      <div className="text-sm text-muted-foreground">{application.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{application.studentName}</div>
                      <div className="text-sm text-muted-foreground">Age {application.studentAge}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {application.preferredCourses.slice(0, 2).map((course, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {course}
                        </Badge>
                      ))}
                      {application.preferredCourses.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{application.preferredCourses.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDocumentStatus(application.documents)}
                  </TableCell>
                  <TableCell>{format(application.applicationDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getStatusBadge(application.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openApplicationDetail(application)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Application Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              External Parent Application
            </DialogTitle>
            <DialogDescription>
              Review and manage external parent application details
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedApplication.studentName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applied by {selectedApplication.parentName} on {format(selectedApplication.applicationDate, "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedApplication.status)}
                </div>
              </div>

              <Separator />

              {/* Parent Information */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Parent Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedApplication.parentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{selectedApplication.phone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Student Information */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Student Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                    <p className="font-medium">{selectedApplication.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{selectedApplication.studentAge} years old</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preferred Courses */}
              <div className="space-y-3">
                <h4 className="font-medium">Preferred Courses</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.preferredCourses.map((course, index) => (
                    <Badge key={index} variant="secondary">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Document Status */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Required Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ID Card/Passport</span>
                    {selectedApplication.documents.idCard ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Proof of Address</span>
                    {selectedApplication.documents.proofOfAddress ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Student Birth Certificate</span>
                    {selectedApplication.documents.studentBirthCertificate ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medical Certificate</span>
                    {selectedApplication.documents.medicalCertificate ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Application Notes
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{selectedApplication.notes}</p>
                </div>
              </div>

              {/* Review Information */}
              {selectedApplication.reviewedBy && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium">Review Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Reviewed By</p>
                        <p className="font-medium">{selectedApplication.reviewedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Review Date</p>
                        <p className="font-medium">
                          {selectedApplication.reviewDate ? format(selectedApplication.reviewDate, "MMM dd, yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>
                    {selectedApplication.reason && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p className="font-medium">{selectedApplication.reason}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              {!actionType && selectedApplication.status === "pending" && (
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("approve")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleAction("review")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Move to Review
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleAction("reject")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              )}

              {/* Action Form */}
              {actionType && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">
                    {actionType === "approve" ? "Approve Application" : 
                     actionType === "reject" ? "Reject Application" : "Move to Review"}
                  </h4>
                  
                  <div>
                    <label className="text-sm font-medium">
                      {actionType === "approve" ? "Approval Notes (Optional)" : 
                       actionType === "reject" ? "Rejection Reason" : "Review Notes"}
                    </label>
                    <Textarea
                      placeholder={`Enter ${actionType} reason/notes...`}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="min-h-20"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={confirmAction}
                      className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : 
                                actionType === "reject" ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      Confirm {actionType === "approve" ? "Approval" : 
                               actionType === "reject" ? "Rejection" : "Review"}
                    </Button>
                    <Button variant="outline" onClick={() => setActionType(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {selectedApplication.status !== "pending" && !actionType && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={closeModal}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}