export interface Session {
  backend: "native" | "docker";
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onData(cb: (data: string) => void): void;
  onExit(cb: (code: number) => void): void;
  kill(): void;
}