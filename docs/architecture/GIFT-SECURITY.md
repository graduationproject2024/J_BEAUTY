# J BEAUTY — Secure Digital Gift Cards Architecture

**Domain:** Luxury Digital Gifting Experience  
**Model:** Pre-Paid Luxury Voucher System  
**Security Mandate:** Unpaid gift cards are completely unredeemable. Single-redemption atomic locking with cryptographic voucher tokens.

---

## 1. Gifting Lifecycle & Security Model

```
+-----------------------------------------------------------------------------------+
|                        Customer Gift Creation (/ar/gifts)                         |
|   - Recipient Name, Sender Name, Custom Message, Selected Package                 |
|   - Status: pending_payment                                                       |
|   - Voucher Code Generated: Cryptographically pseudo-random (e.g. JGIFT-8F2A)     |
|   - Card Preview shows masked code: ••••-••••-JGIFT                               |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Customer completes bank transfer & uploads proof
                                       v
+-----------------------------------------------------------------------------------+
|                   Staff Payment Verification (Operations Portal)                  |
|   - Operations verifies funds in bank account                                      |
|   - Staff clicks "اعتماد وتفعيل بطاقة الإهداء"                                     |
|   - Card status -> active; activated_at -> now()                                  |
+-----------------------------------------------------------------------------------+
                                       |
                                       | Recipient presents code at checkout
                                       v
+-----------------------------------------------------------------------------------+
|                        Gift Redemption at Booking Checkout                        |
|   - System verifies:                                                              |
|     1. Code exists in gift_cards                                                  |
|     2. status === 'active' (Unpaid or pending cards reject with HTTP 400)          |
|     3. redeemed === 0                                                             |
|     4. expires_at > now()                                                         |
|   - Atomic Transaction:                                                           |
|     * Mark redeemed = 1, redeemed_at = now(), redeemed_booking_id = booking.id    |
|     * Deduct discount from booking total                                          |
+-----------------------------------------------------------------------------------+
```

---

## 2. Unpaid Gift Defense & Masking

1. **Card Visual Masking:**
   Prior to payment verification, the gift preview renders:
   `••••-••••-JGIFT`
   A luxury badge states: *"بطاقة قيد التفعيل — يُعتمد الكود فور توثيق التحويل البنكي"*.
   The recipient or purchaser cannot copy or apply the real token until authorized staff confirms the bank deposit.
2. **Redemption Engine Defense:**
   In `server/booking.mjs`, when a coupon or gift code is passed:
   ```sql
   SELECT * FROM gift_cards WHERE code=? AND status='active' AND redeemed=0;
   ```
   If `status !== 'active'`, the engine rejects the request with HTTP 400 (`بطاقة الإهداء غير مفعلة أو بانتظار توثيق التحويل البنكي`).

---

## 3. Single-Redemption Atomic Locking & Race Protection

To prevent concurrent double-redemption (e.g. two browser tabs applying the same gift card simultaneously):
- The redemption update is executed inside a SQLite `db.tx()` transaction:
  ```sql
  UPDATE gift_cards 
  SET redeemed=1, redeemed_at=?, redeemed_booking_id=? 
  WHERE id=? AND redeemed=0 AND status='active';
  ```
- If rows modified equals 0, the transaction aborts with HTTP 409 (`تم استخدام بطاقة الإهداء مسبقاً`).

---

## 4. Luxury Export Rules (Section 15 Compliance)

When a customer or staff exports the digital gift card as a high-resolution PNG:
- **No Price Display:** The monetary amount (SAR value) is strictly omitted from the visual image to preserve luxury gifting etiquette.
- **No City Mention:** The location string "المدينة المنورة" is strictly omitted from the exported luxury gift card image.
- **Official Branding:** The card renders the high-fidelity official J BEAUTY emblem on a rich velvet plum background (`#503C45`) with rose-gold embossed typography (`#D4AF7C`).
