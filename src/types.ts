export interface FtpdStatus {
  running: boolean;
  ip: string;
  port: number;
  root: string;
  username: string;
  anonymous: boolean;
}

export interface FtpdSettings {
  port: number;
  passive_port_start: number;
  passive_port_end: number;
  username: string;
  password: string;
  anonymous: boolean;
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
