export type PaymentMode = 'succeed' | 'fail' | 'flaky';
export type LatencyMode = 'none' | 'normal' | 'slow';
export type FailureArea = 'catalogue' | 'cart' | 'orders' | 'assistant';

export interface DemoControls {
  payment: PaymentMode;
  latency: LatencyMode;
  failing: Record<FailureArea, boolean>;
}

export const DEFAULT_CONTROLS: DemoControls = {
  payment: 'succeed',
  latency: 'normal',
  failing: { catalogue: false, cart: false, orders: false, assistant: false },
};

export const CONTROLS_STORAGE_KEY = 'auramart.demo.controls.v1';

/** Latency ranges in ms. "normal" is 250–600 ms with deterministic jitter, as the spec asks. */
export const LATENCY_RANGE: Record<LatencyMode, [number, number]> = {
  none: [0, 0],
  normal: [250, 600],
  slow: [2000, 2000],
};

function isPayment(value: unknown): value is PaymentMode {
  return value === 'succeed' || value === 'fail' || value === 'flaky';
}

function isLatency(value: unknown): value is LatencyMode {
  return value === 'none' || value === 'normal' || value === 'slow';
}

export function readControls(): DemoControls {
  try {
    const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (!raw) return DEFAULT_CONTROLS;
    const parsed = JSON.parse(raw) as Partial<DemoControls>;
    return {
      payment: isPayment(parsed.payment) ? parsed.payment : DEFAULT_CONTROLS.payment,
      latency: isLatency(parsed.latency) ? parsed.latency : DEFAULT_CONTROLS.latency,
      failing: { ...DEFAULT_CONTROLS.failing, ...parsed.failing },
    };
  } catch {
    return DEFAULT_CONTROLS;
  }
}

export function writeControls(next: DemoControls): void {
  try {
    localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the controls still apply for this page session only.
  }
}
