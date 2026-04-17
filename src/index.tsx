import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Field,
  staticClasses,
} from "@decky/ui";
import {
  addEventListener,
  removeEventListener,
  callable,
  definePlugin,
  toaster,
} from "@decky/api";
import { useState, useEffect, useCallback } from "react";
import { FaNetworkWired } from "react-icons/fa";

// ── backend callables ──────────────────────────────────────────────────────
const startServer = callable<[], { success: boolean; error?: string }>(
  "start_server",
);
const stopServer = callable<[], { success: boolean; error?: string }>(
  "stop_server",
);
const getStatus = callable<
  [],
  {
    running: boolean;
    ip: string;
    port: number;
    root: string;
  }
>("get_status");

// ── status indicator dot ───────────────────────────────────────────────────
function StatusDot({ running }: { running: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        marginRight: 6,
        background: running ? "#4ade80" : "#6b7280",
        boxShadow: running ? "0 0 6px #4ade80" : "none",
        transition: "background 0.3s, box-shadow 0.3s",
      }}
    />
  );
}

// ── monospace address badge ────────────────────────────────────────────────
function AddressBadge({ ip, port }: { ip: string; port: number }) {
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4,
        padding: "2px 8px",
        letterSpacing: "0.03em",
        color: "#e2e8f0",
      }}
    >
      ftp://{ip}:{port}
    </span>
  );
}

// ── main panel content ─────────────────────────────────────────────────────
function Content() {
  const [running, setRunning] = useState<boolean>(false);
  const [ip, setIp] = useState<string>("");
  const [port, setPort] = useState<number>(21);
  const [root, setRoot] = useState<string>("/home/deck");
  const [toggling, setToggling] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    try {
      const s = await getStatus();
      setRunning(s.running);
      setIp(s.ip);
      setPort(s.port);
      setRoot(s.root);
    } catch (_) {
      // backend not ready yet, ignore
    }
  }, []);

  // Initial fetch + poll every 5 s while panel is open
  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleToggle = async (next: boolean) => {
    setToggling(true);
    try {
      const res = next ? await startServer() : await stopServer();
      if (res.success) {
        await refresh();
        toaster.toast({
          title: "decky-ftpd",
          body: next ? "FTP server started" : "FTP server stopped",
          icon: <FaNetworkWired />,
        });
      } else {
        toaster.toast({
          title: "decky-ftpd — error",
          body: res.error ?? "Unknown error",
        });
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <PanelSection title="FTP Server">
        <PanelSectionRow>
          <ToggleField
            label="Enable FTP Server"
            description={
              <span style={{ display: "flex", alignItems: "center" }}>
                <StatusDot running={running} />
                {running ? "Running" : "Stopped"}
              </span>
            }
            checked={running}
            disabled={toggling}
            onChange={handleToggle}
          />
        </PanelSectionRow>

        {running && ip && (
          <PanelSectionRow>
            <Field
              label="Address"
              description="Connect with any FTP client on your local network"
            >
              <AddressBadge ip={ip} port={port} />
            </Field>
          </PanelSectionRow>
        )}

        {running && (
          <PanelSectionRow>
            <Field
              label="Sharing"
              description={
                <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                  {root}
                </span>
              }
            />
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Options">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            description="Port, root directory, passive range…"
            disabled
            onClick={() => {
              // TODO: Navigation.Navigate("/decky-ftpd/settings");
              // Navigation.CloseSideMenus();
            }}
          >
            Settings (coming soon)
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

// ── plugin entry point ─────────────────────────────────────────────────────
export default definePlugin(() => {
  console.log("decky-ftpd: frontend loaded");

  // Listen for server-push events from the backend (future use)
  const listener = addEventListener<[status: string]>(
    "ftpd_status",
    (status) => {
      console.log("decky-ftpd got ftpd_status:", status);
    },
  );

  return {
    name: "decky-ftpd",
    titleView: <div className={staticClasses.Title}>decky-ftpd</div>,
    content: <Content />,
    icon: <FaNetworkWired />,
    onDismount() {
      console.log("decky-ftpd: frontend unloading");
      removeEventListener("ftpd_status", listener);
    },
  };
});
