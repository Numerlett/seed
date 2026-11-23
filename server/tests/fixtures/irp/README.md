# IRP response fixtures

Recorded shapes of what the NIC e-invoice portal returns, used by tests so the
e-invoicing code is exercised against realistic responses without needing GSP
credentials.

`generateIrnSuccess.json` — a registered invoice. The fields the code stores are
`Irn`, `AckNo`, `AckDt`, `SignedInvoice` and `SignedQRCode`. `AckDt` is
`dd/MM/yyyy HH:mm:ss`, which is why `parseIrpDate` exists: `new Date()` reads
that format as month-first and silently returns the wrong day, or an invalid
date past the 12th.

`errors.json` — the business errors the portal returns most often, in its own
`ErrorDetails` envelope. Note that the IRP reports these with an HTTP 200 as
well as with 4xx, so the code cannot rely on the status alone.

The signed payloads are truncated: they are JWTs several kilobytes long, and
nothing in this system parses them — they are stored and handed to whoever
needs to verify the invoice.

**When GSP credentials arrive**, work through
[docs/EINVOICE_GO_LIVE.md](../../../../docs/EINVOICE_GO_LIVE.md) before enabling
the feature for a real business.
