import { Shield, FileText, Eye, CheckCircle, Building } from "lucide-react"

interface Role {
  id: string
  name: string
  badge: string
  subtitle: string
  permissions: string[]
  accentColor: string
}

const roles: Role[] = [
  {
    id: "super_admin",
    name: "Super Admin",
    badge: "FULL ACCESS",
    subtitle: "For system administrators",
    permissions: [
      "Complete system control",
      "Manage all users and settings",
      "Access all financial data"
    ],
    accentColor: "#DC2626"
  },
  {
    id: "admin_accountant",
    name: "AdminAccountant",
    badge: "ADMINISTRATIVE & FINANCIAL",
    subtitle: "For school administrators and accounting staff",
    permissions: [
      "Manage invoices and payments",
      "Configure school settings",
      "Process payments and reports",
      "Manage student data"
    ],
    accentColor: "#3B82F6"
  },
  {
    id: "viewer",
    name: "Viewer",
    badge: "READ ONLY",
    subtitle: "For reporting and oversight",
    permissions: [
      "View financial reports",
      "Read-only access",
      "No editing capabilities"
    ],
    accentColor: "#10B981"
  },
  {
    id: "approver",
    name: "Approver",
    badge: "APPROVAL ONLY",
    subtitle: "For invoice approvers",
    permissions: [
      "Review invoice queue",
      "Approve or reject invoices",
      "View approval history"
    ],
    accentColor: "#8B5CF6"
  }
]

interface RoleSelectionProps {
  onSelectRole: (roleId: string) => void
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFBFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1400px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          {/* School Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            <Building style={{ width: '14px', height: '14px', color: '#6B7280' }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#6B7280',
              letterSpacing: '0.025em'
            }}>
              KING'S COLLEGE INTERNATIONAL SCHOOL BANGKOK
            </span>
          </div>

          {/* Main Heading */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 600,
            color: '#1F2937',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Select Your Access Level
          </h1>

          {/* Instructional Text */}
          <p style={{
            fontSize: '15px',
            fontWeight: 400,
            color: '#6B7280',
            margin: 0
          }}>
            Select the role that matches your position at the school
          </p>
        </div>

        {/* Role Cards */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '32px'
        }}>
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              style={{
                width: '230px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderTop: `2px solid ${role.accentColor}`,
                borderRadius: '8px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              {/* Permission Badge */}
              <div style={{
                display: 'inline-block',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '4px 12px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.05em'
                }}>
                  {role.badge}
                </span>
              </div>

              {/* Role Name */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                {role.name}
              </h3>

              {/* Subtitle */}
              <p style={{
                fontSize: '13px',
                fontWeight: 400,
                color: '#6B7280',
                marginBottom: '16px',
                margin: '0 0 16px 0'
              }}>
                {role.subtitle}
              </p>

              {/* Permissions List */}
              <ul style={{
                margin: '0 0 20px 0',
                padding: '0 0 0 16px',
                listStyle: 'none'
              }}>
                {role.permissions.map((permission, idx) => (
                  <li key={idx} style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: '#374151',
                    lineHeight: '1.6',
                    marginBottom: '6px',
                    position: 'relative',
                    paddingLeft: '12px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '-4px',
                      top: '8px',
                      width: '4px',
                      height: '4px',
                      background: '#D1D5DB',
                      borderRadius: '50%'
                    }}></span>
                    {permission}
                  </li>
                ))}
              </ul>

              {/* Select Button */}
              <button
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F9FAFB'
                  e.currentTarget.style.borderColor = '#9CA3AF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF'
                  e.currentTarget.style.borderColor = '#D1D5DB'
                }}
              >
                Select Role
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#10B981',
              borderRadius: '50%'
            }}></div>
            <span style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#9CA3AF'
            }}>
              Payment Backoffice System • Secure Access Portal
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
