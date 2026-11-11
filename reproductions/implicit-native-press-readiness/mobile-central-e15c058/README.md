# Mobile press cancellation review follow-up

PR #1685 at e15c058 routes all eight press sites through InputBudget.press and makes inputBudget receive the full operation. This centralizes signal forwarding and keeps nonpress hold/cancellation behavior. Existing helper tests/call sites and the documentation wording were updated.

In an independently installed checkout, the existing caller-abort case passed. Removing only the central signal property made that same case fail because one request delivered input after cancellation instead of zero. Restoring the exact source passed. All 523 mobile tests and full pnpm check passed. Source hashes, structure and the one-line negative-control patch are included. Current native CI is reported in the PR; historical native recordings keep their original tested source. No new native recording is claimed for this structural revision. Already accepted native input may still finish.
