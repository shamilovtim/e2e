# Controlled owned-deadline diagnostic proof

Base source: `d9f43ffe4658f0f25649714b9a82bb7c9128a47a`.
Candidate patch SHA-256: `851d9e946febff11d99d4da3ceffe75baa4f75186bed04872863779c0f277919`.

The readiness owner converts its admitted absolute cutoff into a relative AbortSignal timeout. Previously, its generic-error handler preserved the last observed readiness only when the wall clock had reached the cutoff. When the owned timer expired while the wall clock was one tick behind, an observed blocked control was instead diagnosed as a native read failure. No input was dispatched.

The patch retains the existing owned deadline signal in the existing budget object. It preserves the last state when either the absolute cutoff has passed or that owned signal aborted and its reason is the combined signal's actual reason. An earlier caller abort therefore keeps its identity even after the owned timer subsequently expires. Existing typed AppError/cancellation handling and the absolute cutoff remain unchanged. No timeout was increased, and no probe, retry, test accessor, or public API was added.

The existing result-deadline test now establishes an actual blocked response, holds wall Date at cutoff minus one, and waits for the real unchanged 150 ms production signal. Preconditions and zero input are asserted before the diagnostic. In an isolated checkout with its own frozen install and build, the fixed rows passed; the actual base runtime failed only the owned-state case. Restoring the fix passed. Removing only reason identity made the caller-first case fail, proving that an arbitrary aborted signal is insufficient. Restoring again passed all 21 readiness tests.

Targeted V8 coverage passed all 49 readiness/binding tests with 91.37% statements, 92.75% branches, 100% functions, and 94.11% lines. Existing statement/line thresholds were unchanged. Typecheck, lint, and formatting passed. These are isolated candidate results; the SDK author owns the eventual commit, full exact gate, current-head CI, and live performance/device proof.

The original CI failure has the same diagnostic mismatch, but its event/clock sequence was not recorded. These controlled results demonstrate the production boundary and the fix; they do not establish the precise cause of that CI run. Raw logs and checkout paths are excluded from this bundle. Generic excerpts and log hashes permit audit without publishing local state.
