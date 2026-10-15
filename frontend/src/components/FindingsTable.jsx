import { AlertTriangle } from "lucide-react";

export default function FindingsTable({ findings }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Security finding</th>
            <th>Severity</th>
            <th>Evidence</th>
          </tr>
        </thead>

        <tbody>
          {findings.map((finding) => (
            <tr key={finding.finding_id}>
              <td>
                <strong>{finding.resource_name}</strong>
                <small>{finding.resource_id}</small>
              </td>

              <td>
                {finding.issue}
                <small>{finding.recommendation}</small>
              </td>

              <td>
                <span
                  className={`severity severity-${finding.severity.toLowerCase()}`}
                >
                  <AlertTriangle size={12} />
                  {finding.severity}
                </span>
              </td>

              <td className="evidence">
                {finding.evidence}
              </td>
            </tr>
          ))}

          {findings.length === 0 && (
            <tr>
              <td colSpan="4" className="empty">
                No findings yet. Load a configuration and run a scan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}