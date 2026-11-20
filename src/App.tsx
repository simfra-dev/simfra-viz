import { useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CredentialsPage } from "./pages/credentials-page";
import { GraphPage } from "./pages/graph-page";
import type { ConnectionConfig } from "./types";

export default function App() {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [accountId, setAccountId] = useState("000000000000");

  const handleConnect = useCallback(
    (params: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      region: string;
      endpoint?: string;
      accountId: string;
    }) => {
      setConfig({
        credentials: {
          accessKeyId: params.accessKeyId,
          secretAccessKey: params.secretAccessKey,
          sessionToken: params.sessionToken,
        },
        region: params.region,
        endpoint: params.endpoint,
      });
      setAccountId(params.accountId);
    },
    [],
  );

  return (
    <Routes>
      <Route path="/" element={<CredentialsPage onConnect={handleConnect} />} />
      <Route
        path="/graph"
        element={<GraphPage config={config} accountId={accountId} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
