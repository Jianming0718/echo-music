# Echo 0.12.0

Artist biography text is no longer truncated at 900 characters. The provider text is retained in full, including multi-run text and Unicode. The release page keeps accurate release dates but removes the external release-page link and the date-source footer. The music-profile Edge Function uses its existing project-key and origin checks; account data remains in Google Sheets.

Member editing now supports email, status, tier, expiry, role, photo upload/copy/removal, name and handle. System identity and cryptographic fields remain protected. The full behavior and code issuance/redemption rules are documented in apps-script/README.md. A version-4 service retains its basic profile editor and reports that expanded account features require version 5.

Tests exercise the real generated Apps Script router against mocked Sheets and MailApp, and the real webpage against that router. They cover non-admin denial, version conflicts, last-admin protection, email/session updates, explicit reset mail, single/multiple-use codes, generation retries, private history, expiry extension, interrupted grants, preserved administrator changes, account deletion and logout races. No real user's data, membership or email was changed by these tests.

The environment has no supported browser-preview helper. Physical phone layouts and end-to-end email delivery need user verification. Apps Script publishing must be performed by the owner because the current Google connector has no script editing/deployment interface.
