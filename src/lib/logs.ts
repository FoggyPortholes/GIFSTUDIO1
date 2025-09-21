const ring: string[] = [];

export function log(line: string) {
  const entry = `[${new Date().toISOString()}] ${line}`;
  ring.push(entry);
  if (ring.length > 2000) ring.shift();
  console.debug(entry);
}

export function getLogs(): string {
  return ring.join('\n');
}
