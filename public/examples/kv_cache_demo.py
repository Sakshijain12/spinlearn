"""KV cache from scratch: one causal attention head, decoded token by token.

Compares naive decoding (recompute K and V for the whole prefix every step)
with cached decoding (compute k, v for the new token only, append to a cache).
"""
import time
import numpy as np

rng = np.random.default_rng(0)
D_MODEL, D_HEAD = 512, 64
W_Q, W_K, W_V = (rng.standard_normal((D_MODEL, D_HEAD)) / np.sqrt(D_MODEL) for _ in range(3))


def attend(q, K, V):
    """Single-query attention: q (d,), K and V (t, d) -> output (d,)."""
    scores = K @ q / np.sqrt(D_HEAD)
    w = np.exp(scores - scores.max())
    return (w / w.sum()) @ V


def decode_naive(xs):
    outs, kv_rows = [], 0
    for t in range(1, len(xs) + 1):
        X = xs[:t]
        K, V = X @ W_K, X @ W_V          # recompute every row, every step
        kv_rows += t
        outs.append(attend(xs[t - 1] @ W_Q, K, V))
    return np.array(outs), kv_rows


def decode_cached(xs):
    n = len(xs)
    K_cache = np.empty((n, D_HEAD))      # preallocate: no copying as it grows
    V_cache = np.empty((n, D_HEAD))
    outs, kv_rows = [], 0
    for t, x in enumerate(xs):
        K_cache[t], V_cache[t] = x @ W_K, x @ W_V   # only the new token
        kv_rows += 1
        outs.append(attend(x @ W_Q, K_cache[: t + 1], V_cache[: t + 1]))
    return np.array(outs), kv_rows


def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch=1, bytes_per=2):
    return 2 * layers * kv_heads * head_dim * seq_len * batch * bytes_per


if __name__ == "__main__":
    xs = rng.standard_normal((512, D_MODEL))  # stand-in for 512 token hidden states

    t0 = time.perf_counter(); out_naive, rows_naive = decode_naive(xs); t_naive = time.perf_counter() - t0
    t0 = time.perf_counter(); out_cache, rows_cache = decode_cached(xs); t_cache = time.perf_counter() - t0

    print(f"Outputs identical: {np.allclose(out_naive, out_cache)}")
    print(f"K/V rows computed  naive: {rows_naive:,}   cached: {rows_cache:,}")
    print(f"Time               naive: {t_naive:.3f}s  cached: {t_cache:.3f}s  ({t_naive / t_cache:.0f}x faster)")

    for name, heads in [("MHA, 32 KV heads", 32), ("GQA,  8 KV heads", 8)]:
        per_tok = kv_cache_bytes(32, heads, 128, seq_len=1)
        full = kv_cache_bytes(32, heads, 128, seq_len=4096)
        print(f"{name}: {per_tok / 1024:.0f} KiB/token, {full / 2**30:.2f} GiB at 4,096 tokens")
