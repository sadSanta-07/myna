export interface Session {
  onData(callback: (data: string) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): Promise<void> | void;
  onExit(callback: (info: { exitCode: number }) => void): void;
}