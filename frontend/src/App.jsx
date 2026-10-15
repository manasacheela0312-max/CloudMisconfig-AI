
import { useEffect, useState } from "react";
import {
  Cloud,
  AlertTriangle,
  ShieldCheck,
  Activity,
  ScanSearch,
  WandSparkles,
  FileJson,
  Upload,
  RefreshCw
} from "lucide-react";

import Sidebar from "./components/Sidebar.jsx";
import StatCard from "./components/Statcard.jsx";
import FindingsTable from "./components/FindingsTable.jsx";
import RemediationPanel from "./components/RemediationPanel.jsx";
import { api } from "./api.js";

export default function App() {
  const [online, setOnline] = useState(false);
  const [active, setActive] = useState("overview");

  const [config, setConfig] = useState(null);
  const [findings, setFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [verification, setVerification] = useState(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    "Load a sample configuration or upload a JSON file to begin."
  );

  // Recognize supported collection names.
  const resourceKey =
    config &&
    !Array.isArray(config) &&
    typeof config === "object"
      ? ["resources", "misconfigurations", "findings"].find(
          (key) => Array.isArray(config[key])
        )
      : null;

  const resources = resourceKey
    ? config[resourceKey]
    : Array.isArray(config)
      ? config
      : config &&
          typeof config === "object" &&
          config.resource_type
        ? [config]
        : [];

  const isSupportedConfig =
    Boolean(resourceKey) ||
    Array.isArray(config) ||
    Boolean(config?.resource_type);

  // Health check.
  useEffect(() => {
    api.health()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  function resetResults() {
    setFindings([]);
    setAnalysis(null);
    setProposal(null);
    setVerification(null);
  }

  // Load a sample from the backend.
  async function loadSample() {
    setBusy("load");
    setError("");

    try {
      const data = await api.sample();

      setConfig(data);
      resetResults();

      const sampleName = data?.sample_name || "Cloud configuration";

      setMessage(`Loaded sample: ${sampleName}.`);
    } catch (err) {
      setError(`Could not load sample: ${err.message}`);
    } finally {
      setBusy("");
    }
  }

  // Upload any valid JSON file.
  async function uploadConfig(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setBusy("upload");
    setError("");

    try {
      const data = JSON.parse(await file.text());

      setConfig(data);
      resetResults();

      const uploadedResources = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            ["resources", "misconfigurations", "findings"].some(
              (key) => Array.isArray(data[key])
            )
          ? data[
              ["resources", "misconfigurations", "findings"].find(
                (key) => Array.isArray(data[key])
              )
            ]
          : data?.resource_type
            ? [data]
            : null;

      setMessage(
        uploadedResources
          ? `Loaded ${file.name}: ${uploadedResources.length} entries detected.`
          : `Loaded ${file.name}. JSON preview is available below.`
      );
    } catch (err) {
      setError(`Could not load JSON: ${err.message}`);
    } finally {
      setBusy("");
      event.target.value = "";
    }
  }

  // Scan the normalized configuration.
  async function runScan() {
    if (!config) {
      setError("Load a sample or upload a JSON file first.");
      return;
    }

    if (!isSupportedConfig) {
      setError(
        "This is valid JSON, but its structure is not recognized by the scanner. The JSON preview is still available."
      );
      return;
    }

    setBusy("scan");
    setError("");
    setAnalysis(null);
    setProposal(null);
    setVerification(null);

    try {
      const normalizedConfig = { resources };
      const result = await api.scan(normalizedConfig);

      setFindings(
        Array.isArray(result.findings) ? result.findings : []
      );

      setMessage(
        `Scanned ${result.resource_count ?? resources.length} resources. ` +
        `Found ${result.finding_count ?? result.findings?.length ?? 0} findings.`
      );

      setActive("scan");
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setBusy("");
    }
  }

  // AI analysis.
  async function runAnalysis() {
    if (!findings.length) {
      setError("Run a scan before analyzing findings.");
      return;
    }

    setBusy("analyze");
    setError("");

    try {
      const result = await api.analyze(findings);

      setAnalysis(result);
      setMessage("Security analysis completed.");
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setBusy("");
    }
  }

  // Generate a remediation proposal.
  async function generateRemediation() {
    if (!isSupportedConfig || !findings.length) {
      setError("Run a successful scan before generating remediation.");
      return;
    }

    setBusy("remediate");
    setError("");

    try {
      const result = await api.remediate(
        { resources },
        findings.map((finding) => finding.finding_id)
      );

      setProposal(result);
      setVerification(null);

      setMessage("Proposed remediation is ready for review.");
      setActive("remediation");
    } catch (err) {
      setError(`Could not generate remediation: ${err.message}`);
    } finally {
      setBusy("");
    }
  }

  // Verify a proposed local configuration change.
  async function verifyFix() {
    if (!config || !proposal?.proposed_config) {
      setError("Generate a remediation proposal first.");
      return;
    }

    const approved = window.confirm(
      "Apply the proposed changes to the local simulated configuration? No real AWS resources will be changed."
    );

    if (!approved) return;

    setBusy("verify");
    setError("");

    try {
      const originalConfig = { resources };

      const result = await api.verify(
        originalConfig,
        proposal.proposed_config
      );

      setVerification(result);

      if (result.status === "VERIFIED") {
        const fixedConfig = proposal.proposed_config;

        setConfig(fixedConfig);

        // Re-scan the fixed configuration.
        const fixedResources = Array.isArray(fixedConfig.resources)
          ? fixedConfig.resources
          : [];

        const updatedScan = await api.scan({
          resources: fixedResources
        });

        setFindings(
          Array.isArray(updatedScan.findings)
            ? updatedScan.findings
            : []
        );

        setMessage(
          "Verification passed. The local configuration was updated and rescanned."
        );
      } else {
        setMessage(
          "Verification did not pass. Review the verification results."
        );
      }
    } catch (err) {
      setError(`Verification failed: ${err.message}`);
    } finally {
      setBusy("");
    }
  }

  const highCount = findings.filter(
    (finding) => finding.severity === "HIGH"
  ).length;

  const mediumCount = findings.filter(
    (finding) => finding.severity === "MEDIUM"
  ).length;

  const lowCount = findings.filter(
    (finding) => finding.severity === "LOW"
  ).length;

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        onNavigate={setActive}
        online={online}
      />

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              CLOUD SECURITY / OVERVIEW
            </div>

            <h1>Security Dashboard</h1>

            <p>
              Detect cloud configuration risks and verify proposed fixes.
            </p>
          </div>

          <span className="demo-pill">
            <span />
            SIMULATED RESOURCES
          </span>
        </header>

        {error && (
          <div className="alert error" role="alert">
            <AlertTriangle size={18} />

            <span>{error}</span>

            <button
              className="dismiss-error"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="notice" role="status">
          {message}
        </div>

        {/* Dashboard statistics */}
        <section className="stats-grid">
          <StatCard
            title="Resources"
            value={resources.length}
            icon={<Cloud />}
            color="blue"
          />

          <StatCard
            title="Findings"
            value={findings.length}
            icon={<AlertTriangle />}
            color="red"
          />

          <StatCard
            title="High severity"
            value={highCount}
            icon={<ShieldCheck />}
            color="amber"
          />

          <StatCard
            title="Medium / Low"
            value={mediumCount + lowCount}
            icon={<Activity />}
            color="teal"
          />
        </section>

        {/* Configuration scanner */}
        <section className="panel" id="scan">
          <div className="panel-heading">
            <div>
              <h2>
                <ScanSearch size={19} />
                Configuration Scanner
              </h2>

              <p>
                Load sample resources or upload your own JSON.
              </p>
            </div>

            <div className="actions">
              <button
                className="btn secondary"
                onClick={loadSample}
                disabled={Boolean(busy)}
              >
                {busy === "load" ? (
                  <>
                    <RefreshCw size={15} />
                    Loading...
                  </>
                ) : (
                  "Load sample"
                )}
              </button>

              <label
                className="btn secondary upload-btn"
                aria-disabled={Boolean(busy)}
              >
                <Upload size={15} />
                Upload JSON

                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={uploadConfig}
                  disabled={Boolean(busy)}
                />
              </label>

              <button
                className="btn primary"
                onClick={runScan}
                disabled={!config || Boolean(busy)}
              >
                {busy === "scan" ? "Scanning..." : "Run scan"}
              </button>
            </div>
          </div>

          <FindingsTable findings={findings} />
        </section>

        {/* Preview supported resource collections */}
        {config && isSupportedConfig && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <Cloud size={19} />
                  Loaded Cloud Resources
                </h2>

                <p>
                  Preview of the configuration before scanning.
                </p>
              </div>

              <span className="mode-tag">
                {resources.length} entries
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Resource ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Public access</th>
                    <th>Encryption</th>
                    <th>IAM actions</th>
                  </tr>
                </thead>

                <tbody>
                  {resources.map((resource, index) => (
                    <tr
                      key={resource?.resource_id || resource?.id || index}
                    >
                      <td>
                        {resource?.resource_id || resource?.id || "N/A"}
                      </td>

                      <td>
                        <strong>
                          {resource?.name ||
                            resource?.resource_name ||
                            resource?.bucket_name ||
                            "Unnamed"}
                        </strong>
                      </td>

                      <td>
                        {resource?.resource_type ||
                          resource?.type ||
                          "N/A"}
                      </td>

                      <td>
                        {resource?.public_access === true
                          ? "Enabled"
                          : resource?.public_access === false
                            ? "Disabled"
                            : "N/A"}
                      </td>

                      <td>
                        {resource?.encryption_enabled === true
                          ? "Enabled"
                          : resource?.encryption_enabled === false
                            ? "Disabled"
                            : "N/A"}
                      </td>

                      <td>
                        {Array.isArray(resource?.actions)
                          ? resource.actions.join(", ")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}

                  {resources.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty">
                        This configuration contains no resources.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Preview valid JSON in other formats */}
        {config && !isSupportedConfig && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <FileJson size={19} />
                  Uploaded JSON Preview
                </h2>

                <p>
                  Valid JSON loaded. Review its structure below.
                </p>
              </div>
            </div>

            <div className="panel-body">
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
          </section>
        )}

        {/* AI security analysis */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <WandSparkles size={19} />
                AI Security Analysis
              </h2>

              <p>
                Analyze findings using the configured CrewAI workflow.
              </p>
            </div>

            <button
              className="btn secondary"
              onClick={runAnalysis}
              disabled={!findings.length || Boolean(busy)}
            >
              {busy === "analyze"
                ? "Analyzing..."
                : "Analyze findings"}
            </button>
          </div>

          <div className="panel-body">
            {analysis ? (
              <div className="result-box">
                <span className="mode-tag">
                  {analysis.mode || "AI analysis"}
                </span>

                <p>{analysis.summary || "Analysis completed."}</p>

                {Array.isArray(analysis.analysis) &&
                  analysis.analysis.map((item, index) => (
                    <div
                      className="analysis-item"
                      key={item.finding_id || index}
                    >
                      <strong>
                        {item.finding_id || `Analysis ${index + 1}`}
                      </strong>

                      <p>
                        {item.risk_reasoning ||
                          item.recommendation ||
                          ""}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="muted">
                Run a scan first, then request AI analysis.
              </p>
            )}
          </div>
        </section>

        {/* Remediation and verification */}
        <div id="remediation">
          <RemediationPanel
            proposal={proposal}
            verification={verification}
            busy={busy}
            disabled={!isSupportedConfig || !findings.length}
            onGenerate={generateRemediation}
            onVerify={verifyFix}
          />
        </div>

        <footer>
          CloudMisconfig AI · Portfolio MVP · Local simulation only
        </footer>
      </main>
    </div>
  );
}
