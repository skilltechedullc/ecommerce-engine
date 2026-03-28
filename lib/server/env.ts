type EnvOptions = {
  allowEmpty?: boolean
}

export function env(name: string, options: EnvOptions = {}): string {
  const value = process.env[name]
  if (value === undefined || (!options.allowEmpty && value.trim() === '')) {
    throw new Error(`[env] Missing required environment variable: ${name}`)
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production'
}
