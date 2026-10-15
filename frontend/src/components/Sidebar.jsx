import {
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  FileCheck2
} from "lucide-react";

export default function Sidebar({ active, onNavigate, online }) {
  const links = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "scan", label: "Configuration Scan", icon: ScanSearch },
    { id: "remediation", label: "Remediation", icon: FileCheck2 }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={24} />
        </div>
        <div>
          <strong>CloudMisconfig</strong>
          <span>AI SECURITY AUDITOR</span>
        </div>
      </div>

      <div className="nav-label">WORKSPACE</div>

      {links.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${active === id ? "active" : ""}`}
          onClick={() => onNavigate(id)}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}

      <div className="sidebar-bottom">
        <span className={`status-dot ${online ? "online" : "offline"}`} />
        <span>Backend {online ? "online" : "offline"}</span>
        <small>Simulated resources only</small>
      </div>
    </aside>
  );
}