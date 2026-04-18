import { FtpdSettings } from "./types";

export const DEFAULTS: FtpdSettings = {
  port: 2121,
  root_dir: "/",
  passive_port_start: 50000,
  passive_port_end: 50100,
};

export const QUICK_PATHS: Array<{ label: string; path: string }> = [
  { label: "Home", path: "/home/deck" },
  { label: "SD Card", path: "/run/media" },
  { label: "Everything", path: "/" },
];
