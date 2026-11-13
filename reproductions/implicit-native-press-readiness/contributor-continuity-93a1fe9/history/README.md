# Earlier attempts

The initial 7f58 gate failed on one outdated private-binding expectation plus five timeouts and six worker-startup errors overlapping a recorded host sleep. The binding expectation was corrected; all eleven affected suites passed on the awake host. This history is retained and is not represented as a passing original run.

The ff1 gate failed because an existing runtime test file grew to 1,005 lines after integration. Moving the existing seven-leaf readiness test intact into its existing owner file resolved the cap. The subsequent 529 local gate passed, but the separate native unit build failed on Swift named-argument ordering. The one-line test argument-order correction produced candidate 93a, whose exact local gate and fresh production/unit builds passed.

These selected receipts retain original private receipt digests and actual statuses. They omit host paths and raw logs. No video is claimed for command-line-only gate/build failures. All recorded native and fixture failures are included in the media index.
