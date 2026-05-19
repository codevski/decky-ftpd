import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
  Field,
  Focusable,
  DialogButton,
  staticClasses,
  showModal,
} from "@decky/ui";
import {
  addEventListener,
  removeEventListener,
  definePlugin,
  toaster,
} from "@decky/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { FaNetworkWired, FaCog } from "react-icons/fa";
import SettingsModal from "./SettingsModal";
import { FtpdStatus } from "./types";
import { getStatus, startServer, stopServer } from "./backend";

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

function AnonymousBanner() {
  return (
    <div
      style={{
        background: "rgba(202, 138, 4, 0.15)",
        border: "1px solid rgba(250, 204, 21, 0.45)",
        borderRadius: 4,
        padding: "8px 10px",
        margin: "4px 0 10px",
        fontSize: 12,
        lineHeight: 1.35,
        color: "#fde68a",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        ⚠ Anonymous access enabled
      </div>
      <div style={{ opacity: 0.9 }}>
        Anyone on your network can read and write to your Deck without a
        password. Turn this off in Settings for a private connection.
      </div>
    </div>
  );
}

function TitleView() {
  return (
    <Focusable
      className={staticClasses.Title}
      style={{
        display: "flex",
        padding: 0,
        width: "100%",
        boxShadow: "none",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>decky-ftpd</div>
      <DialogButton
        style={{
          height: 28,
          width: 40,
          minWidth: 0,
          padding: "10px 12px",
        }}
        onClick={() => showModal(<SettingsModal />)}
      >
        <FaCog style={{ marginTop: -4, display: "block" }} />
      </DialogButton>
    </Focusable>
  );
}

function Content() {
  const [running, setRunning] = useState<boolean>(false);
  const [ip, setIp] = useState<string>("");
  const [port, setPort] = useState<number>(21);
  const [root, setRoot] = useState<string>("/");
  const [username, setUsername] = useState<string>("deck");
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const topRef = useRef<HTMLDivElement>(null);

  const applyStatus = useCallback((s: FtpdStatus) => {
    setRunning(s.running);
    setIp(s.ip);
    setPort(s.port);
    setRoot(s.root);
    setUsername(s.username ?? "deck");
    setAnonymous(Boolean(s.anonymous));
  }, []);

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

  const loginLabel = anonymous ? "anonymous" : username || "deck";

  return (
    <div ref={topRef}>
      {anonymous && <AnonymousBanner />}
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
            label="Login"
            description={
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                <span style={{ color: anonymous ? "#fde68a" : "inherit" }}>
                  {loginLabel}
                </span>
                <span style={{ opacity: 0.45, margin: "0 6px" }}>·</span>
                <span style={{ opacity: 0.75 }}>{root}</span>
              </span>
            }
          />
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
}

export default definePlugin(() => {
  console.log("decky-ftpd: frontend loaded");
  return {
    name: "decky-ftpd",
    titleView: <TitleView />,
    content: <Content />,
    icon: <FaNetworkWired />,
    onDismount() {
      console.log("decky-ftpd: frontend unloading");
    },
  };
});
