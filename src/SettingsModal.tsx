import { ButtonItem, ModalRoot, TextField } from "@decky/ui";
import { callable, toaster } from "@decky/api";
import { useEffect, useState } from "react";
import { FtpdSettings } from "./types";
import { DEFAULTS } from "./defaults";

const getSettings = callable<[], FtpdSettings>("get_settings");
const saveSettings = callable<
  [Record<string, string | number>],
  { success: boolean; error?: string; restarted?: boolean }
>("save_settings");

interface Props {
  closeModal?: () => void;
}

export default function SettingsModal({ closeModal }: Props) {
  const [portStr, setPortStr] = useState(String(DEFAULTS.port));
  const [rootDir, setRootDir] = useState(DEFAULTS.root_dir);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const cur = s ?? DEFAULTS;
        setPortStr(String(cur.port));
        setRootDir(cur.root_dir);
      })
      .catch((e) => console.error("[decky-ftpd] get_settings failed", e))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveSettings({
        port: portStr,
        root_dir: rootDir.trim(),
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
          <TextField
            label="Root directory"
            description="Absolute path exposed over FTP. Default / (full filesystem)."
            value={rootDir}
            onChange={(e) => setRootDir(e.target.value)}
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
