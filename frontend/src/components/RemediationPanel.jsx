import { CheckCircle2, Wrench } from "lucide-react";

export default function RemediationPanel({
  proposal,
  verification,
  busy,
  onGenerate,
  onVerify,
  disabled
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            <Wrench size={18} /> Remediation & Verification
          </h2>
          <p>
            Propose a fix, review it, and verify the result.
          </p>
        </div>
      </div>

      <div className="panel-body">
        <button
          className="btn secondary"
          onClick={onGenerate}
          disabled={disabled || busy}
        >
          {busy === "remediate"
            ? "Generating..."
            : "Generate remediation"}
        </button>

        {proposal && (
          <>
            <h3 className="subheading">Proposed changes</h3>

            {proposal.changes.map((change, index) => (
              <div
                className="change-item"
                key={`${change.finding_id}-${index}`}
              >
                <strong>{change.resource}</strong>
                <p>{change.field}</p>
                <small>{change.reason}</small>

                <div className="diff-grid">
                  <div>
                    <span>Before</span>
                    <pre>{JSON.stringify(change.before, null, 2)}</pre>
                  </div>
                  <div>
                    <span>After</span>
                    <pre>{JSON.stringify(change.after, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}

            <button
              className="btn primary"
              onClick={onVerify}
              disabled={busy === "verify"}
            >
              <CheckCircle2 size={16} />
              {busy === "verify"
                ? "Verifying..."
                : "Approve local fix & verify"}
            </button>
          </>
        )}

        {verification && (
          <div className="result-box">
            <span className="mode-tag">
              {verification.status}
            </span>

            <p>{verification.message}</p>

            <div className="verification-counts">
              <span>Resolved: {verification.resolved.length}</span>
              <span>Remaining: {verification.remaining.length}</span>
              <span>New: {verification.new_findings.length}</span>
            </div>
          </div>
        )}

        {!proposal && (
          <p className="muted">
            Run a scan before generating a remediation proposal.
          </p>
        )}
      </div>
    </section>
  );
}