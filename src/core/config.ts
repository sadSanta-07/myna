const DEFAULT_SIGNAL_URL = "wss://myna-cloudflare-signal.iffcogc34.workers.dev";

export function getSignalUrl(): string {
  return process.env.SIGNAL_URL || DEFAULT_SIGNAL_URL;
}

export function getShareDomain(): string {
  const signalUrl = getSignalUrl();
  return signalUrl.replace('wss://', 'https://').replace('ws://', 'http://');
}