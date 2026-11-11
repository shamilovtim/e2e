# Final reported-authority test proof

Source head: `2c30d548499e615061b77ec527d7842ae40398d0`. Previous PR head: `16763e010f3491b6845cce1ae19d010c56ac2476`.

Only the existing reported-positive presenter test changed (+18/-2). It now checks the literal reported wire classification, exact screen-space action rectangle (481,314,220,42), and actual private authority handoff. The handoff check copies from the presented nodes into a destination explicitly marked missing, then awaits the production interaction guard. An absent source fact cannot pass through the guard's legacy absence behavior because the destination remains explicitly unknown.

The isolated experiment used its own frozen install and build. The selected test passed. Removing only the actual Apple presenter's evidence attachment caused the test to fail at the intended guard assertion: "Captured action has no established screen-coordinate origin". The wire-classification and global-rectangle assertions passed first. Restoring the attachment returned one pass. The 32 filtered tests were not run in this focused experiment. The disposable checkout was removed; its restored test and presenter matched implementation bytes. The recorded candidate patch is byte-identical to the committed source diff.

The clean exact-commit gate passed all runnable checks: 19,096 unit tests passed, three existing skips, and 373 related tests passed. The complete rebuilt JavaScript manifest contains 631 files, all byte-identical to the previous head. The whole native runner and snapshot-presentation source trees are identical too. This round ran no device test or native rebuild; their existing evidence retains its original commit attribution.

The previous PR head had 14 successful GitHub checks and two skips. New-head GitHub checks remain separate pending publication. See exact-validation.json, source.diff, the omission-control receipt, and complete runtime/source equality manifests.

[Prior device, provider, and review evidence](https://github.com/shamilovtim/e2e/tree/add5ae10709b2b54c31311104b7e2008ff84d111/reproductions/implicit-native-press-readiness/followup-4399-review-16763e0).
