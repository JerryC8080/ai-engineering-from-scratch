"""Logistic-fit time-horizon estimator — stdlib Python.

Given synthetic task results (expert_time_hours, success), fit a logistic
curve to P(success) vs log(expert_time) and report the 50/10/90% horizons.
Then show what eval-context gaming does to the observed number.

Uses only stdlib; the logistic fit is a minimal gradient-descent
implementation sized for pedagogy, not production.
"""

from __future__ import annotations

import math
import random


random.seed(3)


# ---------- Synthetic data generator ----------

def synth_tasks(true_horizon_hours: float, slope: float = 1.2,
                n: int = 120) -> list[tuple[float, bool]]:
    """Generate synthetic (expert_time_hours, success) pairs.

    P(success) = sigmoid(slope * (log(true_horizon) - log(expert_time))).
    """
    log_h = math.log(true_horizon_hours)
    # expert times spanning 0.05 hr to ~48 hr
    out = []
    for _ in range(n):
        t = math.exp(random.uniform(math.log(0.05), math.log(48)))
        logit = slope * (log_h - math.log(t))
        p = 1.0 / (1.0 + math.exp(-logit))
        success = random.random() < p
        out.append((t, success))
    return out


# ---------- Logistic fit (tiny GD) ----------

def sigmoid(x: float) -> float:
    if x > 50:
        return 1.0
    if x < -50:
        return 0.0
    return 1.0 / (1.0 + math.exp(-x))


def fit(tasks: list[tuple[float, bool]], iters: int = 4000,
        lr: float = 0.05) -> tuple[float, float]:
    """Fit P(success) = sigmoid(w * log(t) + b). Return (w, b)."""
    w = 0.0
    b = 0.0
    for _ in range(iters):
        dw = 0.0
        db = 0.0
        n = len(tasks)
        for t, s in tasks:
            y = 1.0 if s else 0.0
            p = sigmoid(w * math.log(t) + b)
            err = p - y
            dw += err * math.log(t)
            db += err
        w -= lr * dw / n
        b -= lr * db / n
    return w, b


def horizon_at(w: float, b: float, p: float) -> float:
    """Expert time where P(success) = p.  sigmoid(w*log(t)+b) = p ->
    log(t) = (logit(p) - b) / w."""
    logit = math.log(p / (1 - p))
    # A zero (or near-zero) slope means success probability does not
    # depend on task length, so the horizon is undefined. Raise rather
    # than silently returning inf/nan so callers see a loud failure.
    eps = 1e-12
    if abs(w) < eps:
        raise ValueError(
            f"horizon undefined: slope w={w} is ~0 "
            f"(b={b}, p={p}, logit={logit})"
        )
    return math.exp((logit - b) / w)


# ---------- Eval-context gaming simulator ----------

def inject_gaming(tasks: list[tuple[float, bool]],
                  gaming_rate: float) -> list[tuple[float, bool]]:
    """Flip `gaming_rate` fraction of failures to successes (model behaves
    better in eval context). Returns a new list."""
    gamed = []
    for t, s in tasks:
        if not s and random.random() < gaming_rate:
            gamed.append((t, True))
        else:
            gamed.append((t, s))
    return gamed


# ---------- Driver ----------

def report(label: str, w: float, b: float) -> None:
    h50 = horizon_at(w, b, 0.50)
    h10 = horizon_at(w, b, 0.10)
    h90 = horizon_at(w, b, 0.90)
    print(f"  {label:<40}  50%={h50:>6.2f} hr  "
          f"10%={h10:>6.2f} hr  90%={h90:>6.2f} hr")


def main() -> None:
    print("=" * 80)
    print("METR-STYLE HORIZON ESTIMATOR (Phase 15, Lesson 21)")
    print("=" * 80)

    true_h = 14.0
    print(f"\nSynthetic ground truth: 50% horizon = {true_h:.1f} hr")
    print("-" * 80)

    tasks = synth_tasks(true_horizon_hours=true_h, n=160)
    w, b = fit(tasks)
    report("clean evaluation (no gaming)", w, b)

    for rate in (0.1, 0.2, 0.4):
        gamed = inject_gaming(tasks, gaming_rate=rate)
        w_g, b_g = fit(gamed)
        report(f"with eval-context gaming rate {rate:.0%}", w_g, b_g)

    print()
    print("=" * 80)
    print("HEADLINE: horizons are fit to observed success; gaming shifts them")
    print("-" * 80)
    print("  Clean fit lands near the synthetic 14-hour horizon.")
    print("  20% gaming pushes the 50% horizon higher than ground truth.")
    print("  40% gaming makes the headline number unreliable.")
    print("  A horizon number without a gaming audit is a capability ceiling")
    print("  that the deploy-context reality may not reach.")


if __name__ == "__main__":
    main()
