import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir, platform } from "os";
import { z } from "zod";

// Schema de configuración
const ConfigSchema = z.object({
  allowedPaths: z.array(z.string()).default([]),
  additionalProtectedPaths: z.array(z.string()).default([]),
  additionalProtectedPatterns: z.array(z.string()).default([]),
});

export type Config = z.infer<typeof ConfigSchema>;

// Rutas del sistema SIEMPRE protegidas (no configurables)
const SYSTEM_PROTECTED_PATHS_UNIX = [
  "/",
  "/bin",
  "/boot",
  "/dev",
  "/etc",
  "/lib",
  "/lib64",
  "/opt",
  "/proc",
  "/root",
  "/run",
  "/sbin",
  "/srv",
  "/sys",
  "/usr",
  "/var",
];

const SYSTEM_PROTECTED_PATHS_MACOS = [
  ...SYSTEM_PROTECTED_PATHS_UNIX,
  "/System",
  "/Library",
  "/Applications",
  "/Volumes",
  "/private",
];

const SYSTEM_PROTECTED_PATHS_WINDOWS = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
];

// Patrones SIEMPRE protegidos (no configurables)
const SYSTEM_PROTECTED_PATTERNS = [
  /^\.git$/,
  /^\.ssh$/,
  /^\.gnupg$/,
  /^\.aws$/,
  /^\.env$/,
  /^\.env\..+$/,
  /^id_rsa$/,
  /^id_ed25519$/,
  /^\.pem$/,
  /^credentials$/,
  /^secrets?$/,
];

// Configuración cargada
let loadedConfig: Config | null = null;

export function getConfigDir(): string {
  const home = homedir();

  if (platform() === "win32") {
    return join(home, "AppData", "Local", "localfiles-org");
  }

  return join(home, ".config", "localfiles-org");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getDefaultAllowedPaths(): string[] {
  const home = homedir();

  // Por defecto, permitir subcarpetas del home pero no el home directamente
  return [
    join(home, "projects"),
    join(home, "Projects"),
    join(home, "dev"),
    join(home, "Development"),
    join(home, "workspace"),
    join(home, "Workspace"),
    join(home, "code"),
    join(home, "Code"),
    join(home, "tmp"),
    join(home, "temp"),
  ];
}

export function getUserProtectedPaths(): string[] {
  const home = homedir();
  const os = platform();

  const userPaths = [
    home, // El home mismo siempre protegido
    join(home, ".ssh"),
    join(home, ".gnupg"),
    join(home, ".aws"),
    join(home, ".config"),
  ];

  if (os === "darwin") {
    // macOS
    userPaths.push(
      join(home, "Library"),
      join(home, "Desktop"),
      join(home, "Documents"),
      join(home, "Downloads"),
      join(home, "Pictures"),
      join(home, "Music"),
      join(home, "Movies")
    );
  } else if (os === "win32") {
    // Windows
    userPaths.push(
      join(home, "Desktop"),
      join(home, "Documents"),
      join(home, "Downloads"),
      join(home, "AppData")
    );
  } else {
    // Linux
    userPaths.push(
      join(home, "Desktop"),
      join(home, "Documents"),
      join(home, "Downloads")
    );
  }

  return userPaths;
}

export function getSystemProtectedPaths(): string[] {
  const os = platform();

  if (os === "darwin") {
    return SYSTEM_PROTECTED_PATHS_MACOS;
  } else if (os === "win32") {
    return SYSTEM_PROTECTED_PATHS_WINDOWS;
  }

  return SYSTEM_PROTECTED_PATHS_UNIX;
}

export function loadConfig(): Config {
  if (loadedConfig) {
    return loadedConfig;
  }

  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      loadedConfig = ConfigSchema.parse(parsed);
    } catch (error) {
      console.error(`Warning: Could not parse config at ${configPath}, using defaults`);
      loadedConfig = ConfigSchema.parse({});
    }
  } else {
    loadedConfig = ConfigSchema.parse({});
  }

  return loadedConfig;
}

export function createDefaultConfig(): string {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const defaultConfig = {
    allowedPaths: getDefaultAllowedPaths(),
    additionalProtectedPaths: [],
    additionalProtectedPatterns: [],
  };

  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));

  return configPath;
}

export function getAllowedPaths(): string[] {
  const config = loadConfig();

  // Si el usuario configuró rutas, usar esas
  if (config.allowedPaths.length > 0) {
    return config.allowedPaths.map(p => expandPath(p));
  }

  // Si no, usar defaults
  return getDefaultAllowedPaths();
}

export function getProtectedPaths(): string[] {
  const config = loadConfig();

  return [
    ...getSystemProtectedPaths(),
    ...getUserProtectedPaths(),
    ...config.additionalProtectedPaths.map(p => expandPath(p)),
  ];
}

export function getProtectedPatterns(): RegExp[] {
  const config = loadConfig();

  const userPatterns = config.additionalProtectedPatterns.map(p => new RegExp(p));

  return [...SYSTEM_PROTECTED_PATTERNS, ...userPatterns];
}

export function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return join(homedir(), p.slice(1));
  }
  return resolve(p);
}

export function reloadConfig(): void {
  loadedConfig = null;
  loadConfig();
}
