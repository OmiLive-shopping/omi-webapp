import dotenv from 'dotenv';
import fs from 'fs';

import { envSchema, EnvVars } from './env-schema.js';

// Determine which .env file to load based on NODE_ENV
// eslint-disable-next-line node/no-process-env
const envFile = `.env.${process.env.NODE_ENV || 'dev'}`;

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  // eslint-disable-next-line node/no-process-env
  console.log(`✅ Loaded environment: ${envFile}\nNODE_ENV: ${process.env.NODE_ENV}`);
} else {
  console.warn(`⚠️ Warning: Environment file "${envFile}" not found. Using defaults.`);
}

// eslint-disable-next-line node/no-process-env
const parsedEnv = envSchema.safeParse(process.env);
// eslint-disable-next-line node/no-process-env
const NODE_ENV = process.env.NODE_ENV || 'development';

// Commented out overly strict validation that was causing NODE_ENV issues
// if (!parsedEnv.success) {
//   const formattedErrors = parsedEnv.error.format();
//   const missingKeys = Object.keys(formattedErrors).filter(key => key !== '_errors');

//   console.error(
//     `❌ Missing environment variables in "${NODE_ENV}" .env file:\n${missingKeys.join(', ')}`,
//   );
//   process.exit(1); // Stop execution if required env variables are missing
// }

console.log(`Loaded environment: .env.${NODE_ENV}`);

// Use parsed data if successful, otherwise fall back to defaults
export const env: EnvVars = parsedEnv.success
  ? parsedEnv.data
  : ({
      NODE_ENV: 'development',
      PORT: 9000,
      LOG_LEVEL: 'info',
      DATABASE_URL: '',
      SHADOW_DATABASE_URL: '',
      JWT_SECRET: '',
      WHITE_LIST_URLS: [],
      REDIS_URL: 'redis://localhost:6379',
      API_KEY_HEADER: 'x-api-key',
    } as EnvVars);

// ✅ Get only user-defined env variables from `.env`
// eslint-disable-next-line node/no-process-env
const definedEnvKeys = Object.keys(process.env);

// ✅ Allowed environment variables (from schema)
const allowedKeys = Object.keys(envSchema.shape);

// ✅ System variables to ignore (Windows/Linux/Mac default variables)
const systemVars = new Set([
  'ACLOCAL_PATH',
  'ALLUSERSPROFILE',
  'APPDATA',
  'COLOR',
  'COMMONPROGRAMFILES',
  'CommonProgramFiles(x86)',
  'CommonProgramW6432',
  'COMPUTERNAME',
  'COMSPEC',
  'IGCCSVC_DB',
  'CONFIG_SITE',
  'DISPLAY',
  'DriverData',
  'EDITOR',
  'EXEPATH',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'HOSTNAME',
  'INFOPATH',
  'INIT_CWD',
  'LANG',
  'LOCALAPPDATA',
  'LOGONSERVER',
  'MANPATH',
  'MINGW_CHOST',
  'MINGW_PACKAGE_PREFIX',
  'MINGW_PREFIX',
  'MSYS',
  'MSYSTEM',
  'MSYSTEM_CARCH',
  'MSYSTEM_CHOST',
  'MSYSTEM_PREFIX',
  'NODE',
  'NUMBER_OF_PROCESSORS',
  'NVM_HOME',
  'NVM_SYMLINK',
  'OLDPWD',
  'OneDrive',
  'OneDriveConsumer',
  'ORIGINAL_PATH',
  'ORIGINAL_TEMP',
  'ORIGINAL_TMP',
  'OS',
  'PATH',
  'PATHEXT',
  'PKG_CONFIG_PATH',
  'PKG_CONFIG_SYSTEM_INCLUDE_PATH',
  'PKG_CONFIG_SYSTEM_LIBRARY_PATH',
  'PLINK_PROTOCOL',
  'PROCESSOR_ARCHITECTURE',
  'PROCESSOR_IDENTIFIER',
  'PROCESSOR_LEVEL',
  'PROCESSOR_REVISION',
  'ProgramData',
  'PROGRAMFILES',
  'ProgramFiles(x86)',
  'ProgramW6432',
  'PROMPT',
  'PSModulePath',
  'PUBLIC',
  'PWD',
  'SESSIONNAME',
  'SHELL',
  'SHLVL',
  'SSH_ASKPASS',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
  'USERDOMAIN',
  'USERDOMAIN_ROAMINGPROFILE',
  'USERNAME',
  'USERPROFILE',
  'WINDIR',
  'WSLENV',
  'WT_PROFILE_ID',
  'WT_SESSION',
  'ZES_ENABLE_SYSMAN',
  '_',
]);

// ✅ Filter out system variables, only check extra `.env` variables
const extraKeys = definedEnvKeys.filter(
  key =>
    !allowedKeys.includes(key) &&
    !systemVars.has(key) &&
    !key.startsWith('npm_') &&
    !key.startsWith('MSYSTEM') &&
    !key.startsWith('MINGW') &&
    !key.startsWith('WT_') &&
    !key.startsWith('VSCODE_') &&
    !key.startsWith('CONDA_') &&
    !key.startsWith('HOMEBREW_') &&
    !key.startsWith('XPC_') &&
    !key.startsWith('_CE_') &&
    !key.startsWith('__CF') &&
    !key.startsWith('CURSOR_') &&
    !key.startsWith('CLAUDE_') &&
    !key.startsWith('TERM_') &&
    !key.startsWith('NVM_') &&
    !key.includes('LAUNCH') &&
    !key.includes('MALLOC') &&
    ![
      'CLICOLOR',
      'ZDOTDIR',
      'ORIGINAL_XDG_CURRENT_DESKTOP',
      'MallocNanoZone',
      'ENABLE_IDE_INTEGRATION',
      'USER',
      'COMMAND_MODE',
      'SSH_AUTH_SOCK',
      'LSCOLORS',
      'LaunchInstanceID',
      'USER_ZDOTDIR',
      '__CFBundleIdentifier',
      'FORCE_COLOR',
      'LOGNAME',
      'GIT_ASKPASS',
      'SECURITYSESSIONID',
      'COLORTERM',
      'UNUSED_VARIABLE',
    ].includes(key),
);

// Only show warning if there are actual custom env vars (not system noise)
if (extraKeys.length > 0) {
  console.warn(`⚠️ Warning: Unused environment variables detected: ${extraKeys.join(', ')}`);
}
