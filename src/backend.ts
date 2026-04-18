import { callable } from "@decky/api";
import { FtpdSettings, FtpdStatus, SaveResult, ToggleResult } from "./types";

export const startServer = callable<[], ToggleResult>("start_server");
export const stopServer = callable<[], ToggleResult>("stop_server");
export const getStatus = callable<[], FtpdStatus>("get_status");
export const getSettings = callable<[], FtpdSettings>("get_settings");
export const saveSettings = callable<
  [Record<string, string | number>],
  SaveResult
>("save_settings");
