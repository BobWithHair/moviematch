import { LogLevels } from "https://deno.land/std@0.79.0/log/mod.ts";
import { config } from "https://deno.land/x/dotenv@v1.0.1/mod.ts";
import { assert } from "https://deno.land/std@0.79.0/_util/assert.ts";
import { readTextFile } from "pkger";

export interface BasicAuth {
  user: string;
  password: string;
}

export interface Config {
  addr: { port: number; hostname: string };
  plexUrl: URL;
  logLevel: keyof typeof LogLevels;
  rootPath: string;
  basicAuth?: BasicAuth;
  devMode: boolean;
  requirePlexLogin: boolean;
  useTestFixtures: boolean;
  writeFixtures: boolean;
  tlsConfig?: { certFile: string; keyFile: string };
  libraryTitleFilter?: string[];
  libraryTypeFilter?: Array<"movie" | "artist" | "photo" | "show">;
}

let currentConfig: Config;

const canReadEnv =
  Deno.permissions &&
  (await Deno.permissions.query({ name: "env" })).state === "granted";

const getTrimmedEnv = (key: string): string | undefined => {
  if (canReadEnv) {
    const value = Deno.env.get(key);
    if (typeof value === "string") {
      return value.trim();
    }
  }
};

export const getConfig = (): Config => {
  if (currentConfig) {
    return currentConfig;
  }

  const {
    PLEX_URL = getTrimmedEnv("PLEX_URL"),
    PLEX_TOKEN = getTrimmedEnv("PLEX_TOKEN"),
    HOST = getTrimmedEnv("HOST") ?? "127.0.0.1",
    PORT = getTrimmedEnv("PORT") ?? 8000,
    LOG_LEVEL = getTrimmedEnv("LOG_LEVEL") ?? "INFO",
    ROOT_PATH = getTrimmedEnv("ROOT_PATH") ?? "",
    AUTH_USER = getTrimmedEnv("AUTH_USER"),
    AUTH_PASS = getTrimmedEnv("AUTH_PASS"),
    REQUIRE_PLEX_LOGIN = getTrimmedEnv("REQUIRE_PLEX_LOGIN") ?? "0",
    LIBRARY_TYPE_FILTER = getTrimmedEnv("LIBRARY_TYPE_FILTER"),
    LIBRARY_TITLE_FILTER = getTrimmedEnv("LIBRARY_TITLE_FILTER"),
    TLS_CERT = getTrimmedEnv("TLS_CERT"),
    TLS_FILE = getTrimmedEnv("TLS_FILE"),
    DEV_MODE = getTrimmedEnv("DEV_MODE") ?? "0",
    DEV_USE_TEST_FIXTURES = getTrimmedEnv("DEV_USE_TEST_FIXTURES") ?? "",
    DEV_WRITE_FIXTURES = getTrimmedEnv("DEV_WRITE_FIXTURES") ?? "",
  } = config();

  const port = Number(PORT);

  assert(!Number.isNaN(port), `PORT must be a string`);
  assert(typeof PLEX_URL === "string", "A PLEX_URL is required");
  assert(typeof PLEX_TOKEN === "string", "A PLEX_TOKEN is required");
  assert(
    isLogLevel(LOG_LEVEL),
    `LOG_LEVEL must be one of ${Object.keys(LogLevels).join(", ")}`
  );

  const basicAuth =
    !!AUTH_USER && !!AUTH_PASS
      ? { user: AUTH_USER, password: AUTH_PASS }
      : undefined;

  currentConfig = {
    addr: { port, hostname: HOST },
    plexUrl: new URL(`${PLEX_URL}?X-Plex-Token=${PLEX_TOKEN}`),
    logLevel: LOG_LEVEL,
    rootPath: ROOT_PATH,
    basicAuth,
    devMode: DEV_MODE === "1",
    requirePlexLogin: REQUIRE_PLEX_LOGIN === "1",
    useTestFixtures: DEV_USE_TEST_FIXTURES === "1",
    writeFixtures: DEV_WRITE_FIXTURES === "1",
    libraryTitleFilter: LIBRARY_TITLE_FILTER?.split(","),
    libraryTypeFilter: (LIBRARY_TYPE_FILTER?.split(",") as
      | Config["libraryTypeFilter"]
      | undefined) ?? ["movie"],
    tlsConfig:
      TLS_CERT && TLS_FILE
        ? { certFile: TLS_CERT, keyFile: TLS_FILE }
        : undefined,
  };

  return currentConfig;
};

function isLogLevel(logLevel: string): logLevel is keyof typeof LogLevels {
  return Object.keys(LogLevels).includes(logLevel);
}