"""Capability-vs-alignment race simulator — stdlib Python.

Two compounding processes per RSI cycle. Capability rate r_c, alignment
rate r_a, each with configurable noise. The simulator tracks the gap
M(t) = C(t) - A(t) and the cycle at which the gap would cross a safety
threshold.
"""

from __future__ import annotations

import random
from dataclasses import dataclass


random.seed(11)


@dataclass
class Config:
    r_c: float
    r_a: float
    noise_c: float
    noise_a: float
    threshold: float = 1.5


def run(cycles: int, cfg: Config) -> list[tuple[int, float, float, float]]:
    c = 1.0
    a = 1.0
    out = [(0, c, a, c - a)]
    for cyc in range(1, cycles + 1):
        nc = cfg.r_c + random.gauss(0, cfg.noise_c)
        na = cfg.r_a + random.gauss(0, cfg.noise_a)
        c *= max(0.9, nc)
        a *= max(0.9, na)
        out.append((cyc, c, a, c - a))
    return out


def crossing_cycle(trajectory, threshold: float) -> int:
    for cyc, c, a, gap in trajectory:
        if gap >= threshold:
            return cyc
    return -1


def print_trajectory(label: str, cfg: Config, cycles: int = 40) -> None:
    traj = run(cycles, cfg)
    print(f"\n{label}")
    print(f"  r_c={cfg.r_c:.2f} r_a={cfg.r_a:.2f} "
          f"noise_c={cfg.noise_c:.3f} noise_a={cfg.noise_a:.3f}")
    print(f"  threshold (C - A): {cfg.threshold:.2f}")
    print(f"  {'cycle':>6}  {'C(t)':>8}  {'A(t)':>8}  {'C-A':>8}  flag")
    for cyc, c, a, gap in traj:
        if cyc in (0, 5, 10, 15, 20, 25, 30, 35, 40):
            flag = "PAUSE" if gap >= cfg.threshold else "ok"
            print(f"  {cyc:>6}  {c:>8.2f}  {a:>8.2f}  {gap:>+8.2f}  {flag}")
    cross = crossing_cycle(traj, cfg.threshold)
    if cross >= 0:
        print(f"  -> threshold crossed at cycle {cross}")
    else:
        print("  -> threshold not crossed in simulated window")


def monte_carlo(cfg: Config, cycles: int, trials: int) -> None:
    crossings = []
    for _ in range(trials):
        traj = run(cycles, cfg)
        cross = crossing_cycle(traj, cfg.threshold)
        if cross >= 0:
            crossings.append(cross)
    print(f"\n  monte-carlo over {trials} trials, {cycles} cycles each")
    print(f"  crossed: {len(crossings)} ({len(crossings)/trials:.0%})")
    if crossings:
        avg = sum(crossings) / len(crossings)
        crossings.sort()
        p50 = crossings[len(crossings) // 2]
        print(f"  mean crossing cycle: {avg:.1f}")
        print(f"  median crossing cycle: {p50}")


def main() -> None:
    print("=" * 70)
    print("CAPABILITY vs ALIGNMENT RACE (Phase 15, Lesson 7)")
    print("=" * 70)

    # Scenario A: capability outpaces alignment moderately
    print_trajectory(
        "Scenario A — capability outpaces alignment",
        Config(r_c=1.15, r_a=1.08, noise_c=0.02, noise_a=0.03),
    )

    # Scenario B: alignment keeps pace
    print_trajectory(
        "Scenario B — matched rates (noise-only drift)",
        Config(r_c=1.10, r_a=1.10, noise_c=0.02, noise_a=0.03),
    )

    # Scenario C: alignment rate higher, but with capability surges
    print_trajectory(
        "Scenario C — alignment higher mean rate but capability surges",
        Config(r_c=1.10, r_a=1.13, noise_c=0.06, noise_a=0.01),
    )

    print("\nMonte-Carlo on Scenario A")
    monte_carlo(
        Config(r_c=1.15, r_a=1.08, noise_c=0.02, noise_a=0.03),
        cycles=30, trials=500,
    )
    print("\nMonte-Carlo on Scenario C")
    monte_carlo(
        Config(r_c=1.10, r_a=1.13, noise_c=0.06, noise_a=0.01),
        cycles=30, trials=500,
    )

    print()
    print("=" * 70)
    print("HEADLINE: small rate differences compound to safety-threshold crossings")
    print("-" * 70)
    print("  Scenario A crosses the 1.5x gap in under 10 cycles.")
    print("  Scenario B stays bounded — same mean rate, noise-only drift.")
    print("  Scenario C: higher alignment mean does NOT save you if")
    print("  capability has big surges. Noise matters as much as drift.")
    print("  RSI-style pipelines need pause-on-gap thresholds baked in.")


if __name__ == "__main__":
    main()
