/**
 * Suppress SES (Secure EcmaScript) errors in development
 * These errors are typically caused by browser extensions like MetaMask
 * and don't affect the application functionality
 */

export function suppressSESErrors() {
  if (typeof window === 'undefined') return

  // Store the original console methods
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log

  // Filter function to check if we should suppress the message
  const shouldSuppress = (args: any[]): boolean => {
    const message = args.join(' ')
    return (
      message.includes('SES_UNCAUGHT_EXCEPTION') ||
      message.includes('lockdown-install.js') ||
      message.includes('ses.umd.min.js') ||
      // Add any other patterns you want to suppress
      false
    )
  }

  // Override console.error
  console.error = function (...args) {
    if (!shouldSuppress(args)) {
      originalError.apply(console, args)
    }
  }

  // Override console.warn
  console.warn = function (...args) {
    if (!shouldSuppress(args)) {
      originalWarn.apply(console, args)
    }
  }

  // Override console.log (if the errors appear there too)
  console.log = function (...args) {
    if (!shouldSuppress(args)) {
      originalLog.apply(console, args)
    }
  }

  // Log that we're suppressing these errors
  originalLog('[Console] Suppressing SES/lockdown errors from browser extensions')
}

/**
 * Alternative approach: Add this to your app if you want to see what's causing it
 */
export function identifySESSource() {
  if (typeof window === 'undefined') return

  // Check for common Web3/crypto extensions
  const checks = {
    MetaMask: !!(window as any).ethereum,
    Web3: !!(window as any).web3,
    Ethereum: !!(window as any).ethereum,
    SES: !!(window as any).ses || !!(window as any).lockdown,
  }

  const detected = Object.entries(checks)
    .filter(([_, exists]) => exists)
    .map(([name]) => name)

  if (detected.length > 0) {
    console.log(`[Security] Detected extensions/features: ${detected.join(', ')}`)
    console.log('[Security] These may cause SES_UNCAUGHT_EXCEPTION errors in the console')
  }

  return detected
}