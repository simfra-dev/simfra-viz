import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network } from "lucide-react";
import { DEFAULT_ENDPOINT, DEFAULT_REGION } from "../lib/constants";

interface CredentialsPageProps {
  onConnect: (config: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
    endpoint?: string;
    accountId: string;
  }) => void;
}

export function CredentialsPage({ onConnect }: CredentialsPageProps) {
  const navigate = useNavigate();
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [accountId, setAccountId] = useState("000000000000");

  const canSubmit = accessKeyId.trim() && secretAccessKey.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      sessionToken: sessionToken.trim() || undefined,
      region: region.trim(),
      endpoint: endpoint.trim() || undefined,
      accountId: accountId.trim(),
    });
    navigate("/graph");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-foreground mb-4">
            <Network className="w-6 h-6 text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Simfra Viz</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Infrastructure visualization for AWS
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Endpoint URL
              <span className="text-muted-foreground font-normal ml-1">
                (optional, for Simfra)
              </span>
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:4599"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="000000000000"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Access Key ID
            </label>
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIA..."
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Secret Access Key
            </label>
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Session Token
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </label>
            <input
              type="password"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Connect
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Credentials are stored in memory only and never sent to any third
          party.
        </p>
      </div>
    </div>
  );
}
