import chalk from 'chalk';

/**
 * Colored logging utility using chalk
 * Provides consistent color coding across the application
 */
export const logger = {
  // HTTP Requests - Blue theme
  http: (message: string) => console.log(chalk.blue(`🌐 ${message}`)),
  httpSuccess: (method: string, path: string, status: number, time: string) =>
    console.log(chalk.cyan(`${method} ${path} ${chalk.green(status)} ${time}`)),

  // Socket Events - Green theme
  socket: (message: string) => console.log(chalk.green(`🔌 ${message}`)),
  socketConnect: (message: string) => console.log(chalk.green.bold(`🟢 SOCKET: ${message}`)),
  socketDisconnect: (message: string) => console.log(chalk.yellow(`🟡 SOCKET: ${message}`)),
  socketError: (message: string) => console.log(chalk.red(`🔴 SOCKET: ${message}`)),

  // Authentication - Yellow theme
  auth: (message: string) => console.log(chalk.yellow(`🔐 ${message}`)),
  authSuccess: (message: string) => console.log(chalk.green(`✅ AUTH: ${message}`)),
  authFailure: (message: string) => console.log(chalk.red(`❌ AUTH: ${message}`)),

  // Stream Events - Magenta/Purple theme
  stream: (message: string) => console.log(chalk.magenta(`📺 ${message}`)),
  streamStart: (message: string) => console.log(chalk.magenta.bold(`🚀 ${message}`)),
  streamEnd: (message: string) => console.log(chalk.magenta(`🛑 ${message}`)),
  streamEvent: (message: string) => console.log(chalk.cyan(`🎬 ${message}`)),

  // System/Initialization - Gray theme
  system: (message: string) => console.log(chalk.gray(`⚙️  ${message}`)),
  systemInit: (message: string) => console.log(chalk.cyan(`🔧 ${message}`)),
  systemReady: (message: string) => console.log(chalk.green(`✅ ${message}`)),

  // Analytics - Cyan theme
  analytics: (message: string) => console.log(chalk.cyan(`📊 ${message}`)),
  metric: (message: string) => console.log(chalk.cyan.bold(`📈 ${message}`)),

  // Errors & Warnings
  error: (message: string) => console.log(chalk.red(`❌ ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`⚠️  ${message}`)),

  // Raw colored text (for inline use)
  colors: {
    http: chalk.blue,
    socket: chalk.green,
    auth: chalk.yellow,
    stream: chalk.magenta,
    system: chalk.gray,
    analytics: chalk.cyan,
    error: chalk.red,
    warning: chalk.yellow,
    success: chalk.green,
  },
};

// Shorter alias
export const log = logger;
