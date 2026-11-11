# Golden fixture follow-up

Source `c7d640fa927be35c09ef37a64b5343a8d9b585ef` restores labels in three positive rounding cases. No cases or assertions were removed. The current fixture has 17 cases and SHA-256 `e5a093f68b60300a99b733c4ae0c1ac70d5b94039f9249009ccaec6e47121707`.

[The single existing native golden-parity method passed](GOLDEN-RECHECK.json) against that current fixture. The unit binary was compiled at `17a96733`, with native fingerprint `615de8de`, and reads the JSON through its repository source path at runtime. It was not rebuilt for this data-only follow-up. The source remained clean and unchanged during the recheck.

All 629 current built JavaScript files are byte-identical to the recorded `17a96733` files; the shipped native fingerprint also remains unchanged. The earlier nine-test and 750 ms fade proof stays attributed to `17a96733`. No additional video or test was created.

The dedicated fixture phone is shut down. No daemon was started. Raw logs, xcresult, state, environment and private application data are excluded.
