export interface FtpdStatus {
  running: boolean;
  ip: string;
  port: number;
  root: string;
}

export interface FtpdSettings {
  port: number;
  root_dir: string;
  passive_port_start: number;
  passive_port_end: number;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  restarted?: boolean;
}

export interface ToggleResult {
  success: boolean;
  error?: string;
  already?: boolean;
}
