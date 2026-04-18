import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Field,
  staticClasses,
  showModal,
} from "@decky/ui";
import {
  addEventListener,
  removeEventListener,
  callable,
  definePlugin,
  toaster,
} from "@decky/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { FaNetworkWired } from "react-icons/fa";
import SettingsModal from "./SettingsModal";
import { FtpdStatus } from "./types";
import { getStatus, startServer, stopServer } from "./backend";
import { QUICK_PATHS } from "./defaults";

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

function Content() {
  const [running, setRunning] = useState<boolean>(false);
  const [ip, setIp] = useState<string>("");
  const [port, setPort] = useState<number>(21);
  const [root, setRoot] = useState<string>("/");
  const [toggling, setToggling] = useState<boolean>(false);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const applyStatus = useCallback((s: FtpdStatus) => {
    setRunning(s.running);
    setIp(s.ip);
    setPort(s.port);
    setRoot(s.root);
  }, []);
  const saveSettings = callable<
    [Record<string, string | number>],
    { success: boolean; error?: string; restarted?: boolean }
  >("save_settings");

  const handleQuickPath = async (path: string) => {
    if (path === root || savingPath !== null) return;
    setSavingPath(path);
    try {
      const res = await saveSettings({ root_dir: path });
      if (!res.success) {
        toaster.toast({
          title: "decky-ftpd — error",
          body: res.error ?? "Failed to change path",
        });
      }
    } finally {
      setSavingPath(null);
    }
  };

  useEffect(() => {
    const resetScroll = () => {
      let el: HTMLElement | null = topRef.current;
      while (el) {
        const style = getComputedStyle(el);
        const scrolls = /(auto|scroll)/.test(style.overflow + style.overflowY);
        if (scrolls && el.scrollHeight > el.clientHeight) {
          el.scrollTop = 0;
          return;
        }
        el = el.parentElement;
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(resetScroll));
  }, []);

  useEffect(() => {
    let cancelled = false;

    getStatus()
      .then((s) => {
        if (!cancelled) applyStatus(s);
      })
      .catch(() => {});

    const listener = addEventListener<[FtpdStatus]>("ftpd_status", (s) => {
      applyStatus(s);
    });

    return () => {
      cancelled = true;
      removeEventListener("ftpd_status", listener);
    };
  }, []);

  const handleToggle = async (next: boolean) => {
    setToggling(true);
    try {
      const res = next ? await startServer() : await stopServer();
      if (res.success) {
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
    <div ref={topRef}>
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
        <PanelSectionRow>
          <Field
            label="Address"
            description={
              running
                ? "Connect with any FTP client on your local network"
                : "Server stopped"
            }
          >
            {running && ip ? (
              <AddressBadge ip={ip} port={port} />
            ) : (
              <span style={{ opacity: 0.4 }}>—</span>
            )}
          </Field>
        </PanelSectionRow>
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
      </PanelSection>

      <PanelSection title="Quick Paths">
        {QUICK_PATHS.map((qp) => {
          const active = root === qp.path;
          return (
            <PanelSectionRow key={qp.path}>
              <ButtonItem
                layout="below"
                disabled={savingPath !== null}
                description={
                  <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {qp.path}
                  </span>
                }
                onClick={() => handleQuickPath(qp.path)}
              >
                {active ? "✓ " : ""}
                {qp.label}
              </ButtonItem>
            </PanelSectionRow>
          );
        })}
      </PanelSection>

      <PanelSection title="Options">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            description="Port, root directory, authentication"
            onClick={() => showModal(<SettingsModal />)}
          >
            Settings
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
}

export default definePlugin(() => {
  console.log("decky-ftpd: frontend loaded");
  return {
    name: "decky-ftpd",
    titleView: <div className={staticClasses.Title}>decky-ftpd</div>,
    content: <Content />,
    icon: <FaNetworkWired />,
    onDismount() {
      console.log("decky-ftpd: frontend unloading");
    },
  };
});
