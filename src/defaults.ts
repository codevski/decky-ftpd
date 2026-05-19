import { FtpdSettings } from "./types";

export const DEFAULTS: FtpdSettings = {
  port: 2121,
  passive_port_start: 50000,
  passive_port_end: 50100,
  username: "deck",
  password: "deck",
  anonymous: false,
};
