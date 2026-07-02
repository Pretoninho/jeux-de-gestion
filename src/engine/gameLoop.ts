export type TickHandler = (deltaSeconds: number, tickCount: number) => void;

/**
 * Fixed-cadence loop with pause and speed multiplier. Decoupled from the
 * flow simulation on purpose: any theme's tick rate needs can be tuned here
 * without touching resolveFlow.
 */
export class GameLoop {
  private speed = 1;
  private running = false;
  private tickCount = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly onTick: TickHandler,
    private readonly baseTickMs = 1000,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.schedule();
  }

  pause(): void {
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error('Speed multiplier must be positive');
    }
    this.speed = multiplier;
    if (this.running) {
      this.pause();
      this.running = true;
      this.schedule();
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private schedule(): void {
    const intervalMs = this.baseTickMs / this.speed;
    this.intervalId = setInterval(() => {
      this.tickCount += 1;
      this.onTick(intervalMs / 1000, this.tickCount);
    }, intervalMs);
  }
}
