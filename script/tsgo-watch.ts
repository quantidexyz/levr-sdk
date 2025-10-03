#!/usr/bin/env bun
/**
 * @description Incremental watch script for tsgo until official --watch support is fixed
 * @see https://github.com/microsoft/typescript-go/issues/937
 */
import { spawn } from 'child_process'
import { watch } from 'fs'
import path from 'path'

// Configuration
const DEBOUNCE_MS = 300
const TSGO_ARGS = ['--noEmit', '--pretty']

// State
let debounceTimer: Timer | null = null
let isRunning = false

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}

/**
 * Format timestamp for console output
 */
function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

/**
 * Log with color and timestamp
 */
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(
    `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors[color]}${message}${colors.reset}`
  )
}

/**
 * Run tsgo type checking
 */
function runTypeCheck() {
  if (isRunning) {
    return
  }

  isRunning = true
  const now = Date.now()

  // Clear console to show only current build logs
  console.clear()
  log('Type checking...', 'cyan')

  const tsgo = spawn('tsgo', TSGO_ARGS, {
    stdio: 'inherit',
    shell: true,
  })

  tsgo.on('close', (code) => {
    isRunning = false
    const duration = ((Date.now() - now) / 1000).toFixed(2)

    if (code === 0) {
      log(`✓ Type check passed in ${duration}s`, 'green')
    } else {
      log(`✗ Type check failed in ${duration}s`, 'red')
    }

    log('Watching for changes...', 'dim')
  })

  tsgo.on('error', (error) => {
    isRunning = false
    log(`Error running tsgo: ${error.message}`, 'red')
  })
}

/**
 * Debounced type check
 */
function scheduleTypeCheck() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    runTypeCheck()
  }, DEBOUNCE_MS)
}

/**
 * Initialize file watcher
 */
async function startWatching() {
  const srcDir = path.resolve(process.cwd(), 'src')
  const testDir = path.resolve(process.cwd(), 'test')
  const rootDir = process.cwd()

  log('Starting incremental type checking with tsgo...', 'cyan')
  log(`Watching: ${srcDir}/**/*.{ts,tsx}`, 'dim')
  log(`Watching: ${testDir}/**/*.{ts,tsx}`, 'dim')
  log(`Watching: ${rootDir}/tsconfig*.json`, 'dim')
  log('', 'reset')

  // Initial type check
  runTypeCheck()

  // Watch src directory for TypeScript files
  const srcWatcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return

    // Only watch TypeScript files
    if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
      return
    }

    // Ignore build artifacts and node_modules
    if (
      filename.includes('node_modules') ||
      filename.includes('.next') ||
      filename.includes('dist')
    ) {
      return
    }

    log(`Changed: ${filename}`, 'yellow')
    scheduleTypeCheck()
  })

  // Watch test directory for TypeScript files
  const testWatcher = watch(testDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return

    // Only watch TypeScript files
    if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
      return
    }

    log(`Changed: ${filename}`, 'yellow')
    scheduleTypeCheck()
  })

  // Watch root directory for tsconfig files
  const configWatcher = watch(rootDir, { recursive: false }, (eventType, filename) => {
    if (!filename) return

    // Only watch tsconfig files
    if (!filename.startsWith('tsconfig') || !filename.endsWith('.json')) {
      return
    }

    log(`Changed: ${filename}`, 'yellow')
    scheduleTypeCheck()
  })

  // Handle termination
  const cleanup = () => {
    log('Stopping watcher...', 'yellow')
    srcWatcher.close()
    testWatcher.close()
    configWatcher.close()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

// Start the watcher
startWatching().catch((error) => {
  console.error('Failed to start watcher:', error)
  process.exit(1)
})
