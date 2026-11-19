# J BEAUTY — Receipt-Based Bank Transfer & Financial Verification Architecture

**Philosophy:** Zero Paid Payment Gateways — Absolute Financial Integrity  
**Core Rule:** Uploading a receipt does **NOT** prove payment. Authorized staff verification against real banking records is mandatory before any financial commitment is locked.  

---

## 1. Zero-Paid-Gateway Design Principles

In alignment with J BEAUTY operational strategy, the platform operates entirely without paid merchant payment intermediaries (such as Moyasar, Stripe, or Tap) and without paid OCR services. 

Financial settlements are conducted directly via Saudi domestic bank transfers (e.g. Al Rajhi Bank IBAN) with customer receipt submission, followed by authenticated staff bank reconciliation.

```
+-----------------------------------------------------------------------------------+
|                        Customer Booking or Gift Card Request                       |
|   - Status: pending_confirmation                                                  |
|   - Payment Status: awaiting_receipt (1-hour reservation hold)                    |
|   - IBAN & Banking details presented cleanly                                      |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Customer performs bank transfer & uploads proof
                                       v
+-----------------------------------------------------------------------------------+
|                       POST /api/bookings/:id/receipt                              |
|   - Magic-byte validation (PNG, JPG, WEBP, PDF only)                              |
|   - Max file size 2MB; Disguised SVG/HTML/JS blocked                              |
|   - Payment Status: receipt_submitted                                             |
|   - Hold Extended: +24 hours                                                      |
|   - IMPORTANT: payment_verified remains FALSE                                     |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Reception / Finance logs into Operations Portal
                                       v
+-----------------------------------------------------------------------------------+
|                     Operations Portal: Financial Reconciliation                   |
|   - Staff inspects uploaded receipt and cross-checks with Al Rajhi Bank statement |
|   - Staff clicks "تأكيد واستلام التحويل البنكي" (POST /api/ops/bookings/:id)       |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Atomically executed in SQLite Transaction
                                       v
+-----------------------------------------------------------------------------------+
|                        Safe Automated Post-Verification Actions                   |
|   1. payment_verified -> true                                                     |
|   2. payment_status -> verified_paid                                              |
|   3. booking.status -> confirmed                                                  |
|   4. hold_expires_at -> cleared                                                   |
|   5. autoAssignPractitioner() -> Optimal specialist scheduled                      |
|   6. Real-time tracking page (/ar/track) moves to Step 3: "تم تأكيد الحجز"        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Magic-Byte Security & Sanitization (`validateReceiptUpload`)

File upload endpoints are common attack vectors. Standard MIME headers provided by browsers can be easily forged. To guarantee system security:
1. **Header Inspection:** Browsers send `image/png`, but the server ignores declared MIME until verified.
2. **Buffer Analysis:**
   - **PNG:** First 4 bytes must be `0x89 0x50 0x4E 0x47` (`.PNG`)
   - **JPEG:** First 3 bytes must be `0xFF 0xD8 0xFF`
   - **WEBP:** Bytes 0–4 must be `RIFF` and bytes 8–12 must be `WEBP`
   - **PDF:** First 4 bytes must be `%PDF`
3. **Execution Block:** Any disguised SVG containing `<script>`, HTML files, shell scripts, or Windows executables are immediately rejected with HTTP 400.
4. **Storage:** Sanitized Base64 data URLs stored securely in `payment_receipts` table with metadata (file size, uploader ID, timestamp, sender name, transfer reference).

---

## 3. Strict 5-Stage Payment Lifecycle

Every financial transaction adheres to an immutable finite-state machine:

```
[ awaiting_receipt ]
         |
         | (Customer uploads receipt)
         v
[ receipt_submitted ]
         |
         +--------------------------------+
         | (Staff confirms bank deposit)   | (Staff rejects invalid receipt)
         v                                v
  [ verified_paid ]               [ payment_failed ]
         |                                |
         | (Service performed)            | (Hold expired / released)
         v                                v
   [ completed ]                    [ cancelled ]
         |
         | (Customer requested cancellation)
         v
    [ refunded ]
```

1. **`awaiting_receipt`:** Booking created. Slot held for 1 hour.
2. **`receipt_submitted`:** Customer uploaded transfer proof. Hold extended to 24 hours. Staff review pending.
3. **`verified_paid`:** Authorized staff (`bookings.update` capability) verified actual bank credit. Booking automatically confirmed.
4. **`completed`:** Practitioner arrived on-site and rendered full service. Only at this stage are J Petals loyalty points credited.
5. **`refunded`:** If cancelled after payment, staff records bank reversal, and awarded loyalty points are atomically deducted.

---

## 4. Idempotency & Concurrency Safety

- **Repeated Verification:** If an operator double-clicks "Verify Payment", the update is strictly idempotent. The system detects `payment_verified === true` and avoids duplicate events, double-confirmations, or duplicate loyalty accruals.
- **Role Isolation:** Only roles with `financials.read` and `bookings.update` (Owner, Ops Manager, Finance) can confirm payments. Practitioners and reception cannot override verified bank records.
