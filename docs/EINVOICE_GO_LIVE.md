# E-Invoicing Go-Live Checklist

E-invoicing is implemented and tested against recorded IRP responses, but it has
never been run against a live GST Suvidha Provider. Everything below is the part
that fixtures cannot prove. Work through it in the GSP's **sandbox** first, and
only then in production.

Until credentials exist the feature is disabled rather than dormant:
`system.getIntegrationStatus` reports `einvoice` as unconfigured, the UI shows
the gate, and any attempt to file raises `PRECONDITION_FAILED` naming the
missing variables. Nothing is written that cannot be completed.

## What is already covered by tests

Do not re-verify these by hand; they are asserted on every CI run.

- The payload is built from the GST figures frozen at confirmation, so what is
  filed matches what was printed (`tests/unit/einvoicePayload.test.ts`).
- `dd/MM/yyyy` acknowledgement dates parse as the day the portal meant
  (`tests/unit/irp.test.ts`).
- A rejection stores the portal's own error codes and messages against the
  invoice, and can be retried (`tests/integration/einvoiceFiling.test.ts`).
- Drafts, B2C invoices, already-filed invoices and e-way bills without an IRN
  are all refused before anything is sent.

## Before enabling

1. **Register with a GSP** and obtain sandbox credentials. Set `GSP_BASE_URL`,
   `GSP_CLIENT_ID`, `GSP_CLIENT_SECRET`, `GSP_USERNAME`, `GSP_PASSWORD` and
   `GSP_GSTIN`. `GSP_GSTIN` must be the GSTIN registered with the IRP, and must
   match the `GSTRegistration` of the business filing.
2. **Confirm the base URL matches the environment.** The sandbox and production
   IRP are different hosts; filing sandbox invoices against production creates
   real, legally binding e-invoices.
3. **Check the API version.** [integrations/adapters/gsp.ts](../integrations/adapters/gsp.ts)
   targets `v1.03` and payload `Version: 1.1`. Confirm your GSP still serves
   these; the adapter will need updating if not.

## Verify in the sandbox

Each step is a thing only a live portal can tell you.

- [ ] **Authentication succeeds.** A wrong client secret should surface as a
      clear error, not a hang. Note how long the token lasts — the adapter
      fetches one per call, which is correct but wasteful; if the GSP rate-limits
      token requests, that becomes a problem worth caching for.
- [ ] **A simple intra-state B2B invoice registers.** Confirm the IRN,
      acknowledgement number and signed QR are all stored on the `EInvoice` row,
      and that `ackDate` is the correct calendar day.
- [ ] **An inter-state invoice registers**, and the portal accepts the IGST-only
      split without complaining about CGST/SGST.
- [ ] **An invoice with a discount and a cess line registers.** These are where
      rounding disputes with the portal usually surface.
- [ ] **A duplicate submission is rejected** with error 2150 and the invoice is
      marked FAILED with that reason visible in the UI.
- [ ] **A deliberately invalid GSTIN is rejected** and the message reaches the
      user intelligibly.
- [ ] **Cancel an IRN within 24 hours** and confirm the row moves to CANCELLED.
- [ ] **Attempt to cancel after 24 hours** — this system refuses locally before
      calling; confirm that matches your GSP's own rule.
- [ ] **Raise an e-way bill against a registered IRN** and check the EWB number
      and validity are stored.

## Reconcile before trusting it

- [ ] Download the portal's own record of a filed invoice and compare every
      figure against the SEED invoice: taxable value, each tax head, and the
      total. They must agree to the paisa.
- [ ] Run `tax.getGstr1Preview` for the period and confirm the same invoices
      appear with the same numbers.

## Production cutover

- [ ] Switch `GSP_BASE_URL` and credentials to production.
- [ ] File **one** low-value real invoice and reconcile it on the GST portal
      before filing anything else.
- [ ] Confirm the business's `GSTRegistration` legal name exactly matches the
      GST portal record; a mismatch is a common rejection cause.

## Known limitations to accept or fix first

- A token is fetched on every call rather than cached until expiry.
- In `long-running` deployment mode filing is queued, and no worker consumes the
  queue — that mode does not boot today. Production runs `serverless`, where
  filing is synchronous.
- There is no bulk filing: invoices are registered one at a time, from the UI.
