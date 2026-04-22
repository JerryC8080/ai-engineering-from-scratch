"""Speaker verification from scratch.

Synthesizes four toy "speakers" as distinct formant-plus-pitch patterns,
extracts mean+var log-mel summary embeddings, computes cosine scores on
same-speaker and different-speaker pairs, and reports EER.

Stdlib only. Run: python3 code/main.py
"""

import math
import random
from collections import defaultdict


def formant_voice(f0, formants, sr, seconds, amp=0.4, jitter=0.0, rng=None):
    rng = rng or random.Random(0)
    n = int(sr * seconds)
    out = []
    for i in range(n):
        t = i / sr
        pitch = f0 * (1.0 + rng.uniform(-jitter, jitter))
        s = 0.0
        for k, fmt in enumerate(formants):
            s += (1.0 / (k + 1)) * math.sin(2.0 * math.pi * fmt * t)
        s += 0.5 * math.sin(2.0 * math.pi * pitch * t)
        out.append(amp * s / (len(formants) + 1))
    return out


def hann(N):
    return [0.5 * (1.0 - math.cos(2.0 * math.pi * n / (N - 1))) for n in range(N)]


def dft_mag(x):
    n = len(x)
    half = n // 2 + 1
    out = []
    for k in range(half):
        re = 0.0
        im = 0.0
        for j in range(n):
            a = -2.0 * math.pi * k * j / n
            re += x[j] * math.cos(a)
            im += x[j] * math.sin(a)
        out.append(math.sqrt(re * re + im * im))
    return out


def hz_to_mel(f):
    return 2595.0 * math.log10(1.0 + f / 700.0)


def mel_to_hz(m):
    return 700.0 * (10 ** (m / 2595.0) - 1.0)


def mel_filterbank(n_mels, n_fft, sr):
    lo, hi = hz_to_mel(0), hz_to_mel(sr / 2)
    mels = [lo + (hi - lo) * i / (n_mels + 1) for i in range(n_mels + 2)]
    hzs = [mel_to_hz(m) for m in mels]
    half = n_fft // 2 + 1
    bins = [min(half - 1, int(round(h * n_fft / sr))) for h in hzs]
    fb = [[0.0] * half for _ in range(n_mels)]
    for m in range(n_mels):
        l, c, r = bins[m], bins[m + 1], bins[m + 2]
        for k in range(l, c):
            fb[m][k] = (k - l) / max(1, c - l)
        for k in range(c, r):
            fb[m][k] = (r - k) / max(1, r - c)
    return fb


def log_mel(signal, sr, n_mels=40, n_fft=256, hop=128):
    w = hann(n_fft)
    frames = [signal[i : i + n_fft] for i in range(0, len(signal) - n_fft + 1, hop)]
    mags = [dft_mag([w[j] * f[j] for j in range(n_fft)]) for f in frames]
    fb = mel_filterbank(n_mels, n_fft, sr)
    out = []
    for spec in mags:
        row = []
        for m in range(n_mels):
            v = 0.0
            for k, wt in enumerate(fb[m]):
                if wt:
                    v += spec[k] * wt
            row.append(math.log(max(v, 1e-10)))
        out.append(row)
    return out


def pool_mean_var(frames):
    n = len(frames[0])
    mean = [sum(f[i] for f in frames) / len(frames) for i in range(n)]
    var = [sum((f[i] - mean[i]) ** 2 for f in frames) / len(frames) for i in range(n)]
    return mean + var


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-12
    nb = math.sqrt(sum(x * x for x in b)) or 1e-12
    return dot / (na * nb)


def eer_from_scores(same_scores, diff_scores):
    thresholds = sorted(set(same_scores + diff_scores))
    best = (1.0, 0.0, 0.0, 0.0)
    for t in thresholds:
        far = sum(1 for s in diff_scores if s >= t) / max(1, len(diff_scores))
        frr = sum(1 for s in same_scores if s < t) / max(1, len(same_scores))
        gap = abs(far - frr)
        if gap < best[0]:
            best = (gap, t, far, frr)
    _, t, far, frr = best
    return (far + frr) / 2, t


def main():
    sr = 8000
    rng = random.Random(0)

    speakers = {
        "alex": {"f0": 110.0, "formants": [730.0, 1090.0, 2440.0]},
        "blair": {"f0": 165.0, "formants": [850.0, 1220.0, 2810.0]},
        "casey": {"f0": 210.0, "formants": [610.0, 1900.0, 2500.0]},
        "dana": {"f0": 95.0, "formants": [570.0, 840.0, 2410.0]},
    }

    print("=== Step 1: enroll 4 synthetic speakers, 5 utterances each ===")
    embeddings = defaultdict(list)
    for name, cfg in speakers.items():
        for _ in range(5):
            sig = formant_voice(cfg["f0"], cfg["formants"], sr, 1.0, jitter=0.02, rng=rng)
            lm = log_mel(sig, sr)
            emb = pool_mean_var(lm)
            embeddings[name].append(emb)
    print(f"  enrolled: {list(embeddings.keys())}")
    print(f"  embedding dim: {len(embeddings['alex'][0])}")

    print()
    print("=== Step 2: build same-speaker and different-speaker pair scores ===")
    same, diff = [], []
    names = list(embeddings.keys())
    for n in names:
        embs = embeddings[n]
        for i in range(len(embs)):
            for j in range(i + 1, len(embs)):
                same.append(cosine(embs[i], embs[j]))
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            for ea in embeddings[a]:
                for eb in embeddings[b]:
                    diff.append(cosine(ea, eb))
    print(f"  same-speaker pairs: {len(same)}  mean cos: {sum(same)/len(same):.3f}")
    print(f"  diff-speaker pairs: {len(diff)}  mean cos: {sum(diff)/len(diff):.3f}")

    print()
    print("=== Step 3: Equal Error Rate ===")
    eer, t = eer_from_scores(same, diff)
    print(f"  EER = {eer * 100:.2f}%  at threshold cos = {t:.3f}")

    print()
    print("=== Step 4: what ECAPA would give you ===")
    print("  toy mean-var pooling:  EER depends heavily on synthesis (often 5-15%)")
    print("  ECAPA-TDNN, VoxCeleb1-O: 0.87%  (SpeechBrain 2022)")
    print("  3D-Speaker CAM++:       0.50%  (Alibaba 2024)")
    print("  pyannoteAI Precision-2: <0.40%  (commercial 2026)")

    print()
    print("takeaways:")
    print("  - score = cosine(emb_a, emb_b); decision = score > threshold")
    print("  - calibrate threshold on your channel (phone vs studio ~2x EER)")
    print("  - for diarization, cluster the ECAPA embeddings with spectral / online clustering")


if __name__ == "__main__":
    main()
