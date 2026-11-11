# Independent web timeout assertion fix

[Issue #1689](https://github.com/e2e-inc/e2e/issues/1689) and [PR #1690](https://github.com/e2e-inc/e2e/pull/1690), source `70d7f9b702d2ebb6b27436d02046b82c049ec716`, track the pre-existing web integration assertion found while verifying the mobile cancellation PR.

A missing-locator test required the exact text `Timeout 2000ms exceeded`. The unchanged production action correctly forwards the remaining deadline, so one elapsed millisecond can produce `Timeout 1999ms exceeded`. The revised existing assertion captures the integer diagnostic and requires a positive value no greater than 2000. It retains the anchored error prefix, NOT_ACTIONABLE/nonretryable result, missing-locator diagnostic and elapsed bound below 3500 ms. No production code or new test case changes.

[The validation receipt](validation.json) separates the initial implementation checks from the bounded-assertion follow-up. Initial install/build, full repository checks, 83 focused Chromium tests and the full web suite passed. The final source passed affected lint/typecheck and the full 75-file web suite: 784 passing tests and one existing skipped test. Full initial checks are not relabeled as rerun at the final head. The [source patch](web-timeout.patch) is generic upstream test code only.

The unrelated failure remains visible on the mobile PR until an upstream maintainer revalidates or integrates this independent fix. The rerun attempt was rejected for lack of repository admin rights. A successful rerun would be revalidation, not a repair of the brittle assertion. This append contains no private application data, raw diagnostics or media.
