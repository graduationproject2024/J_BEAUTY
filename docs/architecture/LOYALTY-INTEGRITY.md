# J BEAUTY — J Petals Loyalty Program Financial Integrity & Ledger Architecture

**Program Name:** برنامج بتلات J (J Petals Loyalty Program)  
**Ledger Model:** Double-Entry Audit Trail  
**Fundamental Rule:** Loyalty petals are awarded **strictly** upon full service completion combined with verified paid bank settlement.  

---

## 1. Loyalty Mechanics & Welcome Gift

1. **Welcome Petals:**
   - Every registered customer receives a one-time welcome bonus of **50 Petals** (`welcome_bonus`) upon account creation.
   - Recorded immediately in `loyalty_ledger`.
2. **Accrual Ratio:**
   - **1 SAR = 1 J Petal**
   - Calculated strictly on the net eligible amount paid (excluding discounts, redeemed coupons, and complementary waivers).
3. **Strict Completion Gate:**
   - Placing a booking awards **0 petals**.
   - Uploading a bank transfer receipt awards **0 petals**.
   - Admin confirming payment awards **0 petals**.
   - Only when `status === 'completed'` AND `payment_verified === true` does the system invoke `accrueLoyaltyForBooking(db, helpers, bookingId)`.

---

## 2. Immutable Loyalty Ledger Schema

All point movements are stored in `loyalty_ledger`:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Unique transaction UUID |
| `user_id` | TEXT | Customer identifier |
| `delta` | INTEGER | Points added (+N) or deducted (-N) |
| `reason` | TEXT | Categorical reason (`welcome_bonus`, `booking_completed`, `reward_redemption`, `refund_reversal`) |
| `reference_id` | TEXT | Linked entity (`booking_id`, `reward_id`, etc.) |
| `created_at` | TEXT | ISO-8601 UTC timestamp |

### Current Balance Invariant

The customer's available petal balance is always calculated as the transactional sum:

$$\text{Current Petal Balance} = \sum_{i} \text{delta}_i$$

---

## 3. Tier Hierarchy & Progression

Customer status dynamically updates according to accrued lifetime petals:

| Tier Name (Arabic) | Tier Name (English) | Petal Threshold | Exclusive Privileges |
| :--- | :--- | :---: | :--- |
| **البتلة الفضية** | Silver Petal | 0 – 199 | Welcome bonus, access to standard home appointments |
| **الدلال الذهبي** | Golden Pampering | 200 – 499 | Priority peak scheduling, complementary scalp massage add-on |
| **الياسمين الملكي** | Royal Jasmine VIP | 500+ | Dedicated master specialist, custom aromatics, exclusive event invites |

---

## 4. Refund & Cancellation Ledger Adjustments

When an appointment is cancelled or refunded after completion or payment:
1. The system checks `loyalty_ledger` for any positive delta previously awarded for that `reference_id` (booking ID).
2. If points were awarded, a negative offsetting transaction (`reason: refund_reversal`) is inserted within the same SQLite transaction.
3. The customer's net balance is decremented accordingly.
4. If a customer attempts to churn by redeeming points before requesting a refund, the ledger enters negative balance protection, preventing any future redemptions until reconciled.

---

## 5. Concurrent Reward Race Condition Defense

When a customer redeems petals (e.g. 200 petals for a free session):
- An atomic check validates `current_balance >= reward_cost` and verifies no pending reward request exists.
- The deduction is committed with a single transaction lock.
- If two requests arrive within milliseconds (tested in Scenario 19), the first succeeds and the second is rejected with HTTP 409 (`طلب مكافأة معلق بالفعل`).
