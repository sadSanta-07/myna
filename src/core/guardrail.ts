export function isDangerousCommand(cmd: string): boolean {
  const normalized = cmd.toLowerCase().trim();
  
  const dangerousPatterns = [
    /\brm\s+-[a-z]*r[a-z]*f[a-z]*\b/, 
    /\bformat\s+[a-z]:/,
    /\bremove-item\s+.*-recurse/,
    /\bdd\s+if=.*of=\//,
    /\bmkfs\b/,
    /\bdrop\s+table\b/,
    />\s*\/dev\/(sd[a-z]|nvme)/
  ];

  return dangerousPatterns.some(pattern => pattern.test(normalized));
}