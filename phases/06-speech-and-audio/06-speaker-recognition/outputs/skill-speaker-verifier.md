---
name: speaker-verifier
description: Pick speaker embedding model, enrollment policy, threshold calibration, and diarization hand-off for a given workload.
version: 1.0.0
phase: 6
lesson: 06
tags: [speaker, verification, diarization, ecapa, pyannote]
---

Given the workload (biometric unlock / call-center auth / meeting diarization / TTS speaker conditioning), output:

1. Embedding model. ECAPA-TDNN (SpeechBrain) · WavLM-base + TDNN head · 3D-Speaker CAM++ · pyannoteAI Precision-2 (commercial). One-sentence reason.
2. Enrollment policy. N clips per user, min duration, cross-session/device diversity, centroid vs per-clip scoring.
3. Threshold calibration. Sweep on a dev set of 1000+ same/diff pairs from your channel. Pick τ at operating-point trade-off (e.g. FAR 1%, FRR 2%). Re-calibrate quarterly.
4. Diarization pipeline (if needed). pyannote 3.1 / community-1 segmentation → ECAPA embeddings → spectral / online clustering → overlap detection → (optional) ASR alignment.
5. Guards. Min clip duration ≥ 1 s, noise/SNR gate, anti-spoofing (see Lesson 16). For biometric auth: liveness challenge (random phrase TTS).

Refuse to ship biometric verification without anti-spoofing — voice cloning makes cosine-only auth a 2026 liability. Refuse &lt; 1 s enrollment clips — embeddings are unreliable. Flag single-enrollment-clip policies (brittle to one bad recording). Flag pipelines using VoxCeleb thresholds on phone-channel data without recalibration.

Example input: "Speaker-attributed transcription for legal-deposition audio (1-3 speakers, offline, 60-90 min clips)."

Example output:
- Model: pyannote 3.1 / community-1 for segmentation + ECAPA-TDNN (SpeechBrain) for embeddings. Apache-2.0; meets "no cloud PII" constraint.
- Enrollment: not applicable (blind diarization). Optionally enroll counsel + witness centroid (3 clips each) for post-hoc labeling.
- Threshold: none needed (clustering assigns labels). Use AHC with `min_cluster_size=2` and `min_duration_on=0.5`.
- Pipeline: pyannote segmentation → ECAPA embeddings per 1.5 s window → agglomerative clustering → overlap detection → Whisper-large-v3-turbo forced-aligned to diarized segments.
- Guards: reject segments &lt; 0.5 s; flag overlap regions for human review; log DER on a 10-min hand-labeled subsample before scaling.
