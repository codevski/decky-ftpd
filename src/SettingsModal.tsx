import {
  ButtonItem,
  ConfirmModal,
  ModalRoot,
  TextField,
  ToggleField,
  showModal,
} from "@decky/ui";
import { callable, toaster } from "@decky/api";
import { useEffect, useState } from "react";
import { FtpdSettings } from "./types";
import { DEFAULTS } from "./defaults";

const getSettings = callable<[], FtpdSettings>("get_settings");
const saveSettings = callable<
  [Record<string, string | number | boolean>],
  { success: boolean; error?: string; restarted?: boolean }
>("save_settings");

interface Props {
  closeModal?: () => void;
}

export default function SettingsModal({ closeModal }: Props) {
  const [portStr, setPortStr] = useState(String(DEFAULTS.port));
  const [username, setUsername] = useState(DEFAULTS.username);
  const [password, setPassword] = useState(DEFAULTS.password);
  const [anonymous, setAnonymous] = useState(DEFAULTS.anonymous);
  const [anonToggleKey, setAnonToggleKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((setting) => {
        const cur = setting ?? DEFAULTS;
        setPortStr(String(cur.port));
        setUsername(cur.username ?? DEFAULTS.username);
        setPassword(cur.password ?? DEFAULTS.password);
        setAnonymous(Boolean(cur.anonymous));
      })
      .catch((e) => console.error("[decky-ftpd] get_settings failed", e))
      .finally(() => setLoading(false));
  }, []);

  const handleAnonymousToggle = (next: boolean) => {
    if (!next) {
      setAnonymous(false);
      return;
    }
    const resetVisualToggle = () => {
      setAnonymous(false);
      setAnonToggleKey((k) => k + 1);
    };
    showModal(
      <ConfirmModal
        strTitle="Disable authentication?"
        strDescription={
          "Anonymous mode means anyone on the same Wi-Fi network can read, " +
          "write, and delete files on your Steam Deck without a password. " +
          "Only enable this on a trusted home network you control.\n\n" +
          "Continue?"
        }
        strOKButtonText="Enable anonymous"
        strCancelButtonText="Cancel"
        bDestructiveWarning
        bAlertDialog
        onOK={() => setAnonymous(true)}
        onCancel={resetVisualToggle}
        onEscKeypress={resetVisualToggle}
      />,
    );
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveSettings({
        port: portStr,
        username: username.trim(),
        password,
        anonymous,
      });
      if (res.success) {
        toaster.toast({
          title: "decky-ftpd",
          body: res.restarted
            ? "Settings saved. Server restarted."
            : "Settings saved.",
        });
        closeModal?.();
      } else {
        toaster.toast({
          title: "decky-ftpd",
          body: res.error ?? "Failed to save.",
        });
      }
    } catch (e) {
      console.error("[decky-ftpd] save_settings failed", e);
      toaster.toast({ title: "decky-ftpd", body: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalRoot onCancel={closeModal} onEscKeypress={closeModal}>
      <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        decky-ftpd settings
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <TextField
            label="Port"
            description="Control connection port. Default 2121. Must be ≥ 1024."
            value={portStr}
            onChange={(e) => setPortStr(e.target.value)}
          />

          <div style={{ marginTop: 16, marginBottom: 4, fontWeight: 600 }}>
            Authentication
          </div>

          <TextField
            label="Username"
            description="FTP login username. Default 'deck'."
            value={username}
            disabled={anonymous}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            description="FTP login password. Default 'deck' — change this if you share a network."
            value={password}
            disabled={anonymous}
            bIsPassword
            onChange={(e) => setPassword(e.target.value)}
          />
          <ToggleField
            key={`anon-toggle-${anonToggleKey}`}
            label="Anonymous access (no password)"
            description={
              <span style={{ color: anonymous ? "#fca5a5" : "#94a3b8" }}>
                {anonymous
                  ? "⚠ Anyone on your network can connect with no password and full read/write access. Only use on a trusted home network."
                  : "Off: a username and password are required to connect. Recommended."}
              </span>
            }
            checked={anonymous}
            onChange={handleAnonymousToggle}
          />

          <div style={{ marginTop: 16 }}>
            <ButtonItem layout="below" disabled={saving} onClick={onSave}>
              {saving ? "Saving…" : "Save & Restart Server"}
            </ButtonItem>
          </div>
        </>
      )}
    </ModalRoot>
  );
}
