# J BEAUTY — Intelligent Booking & Scheduling Engine Architecture

**Domain:** In-Home Beauty & Wellness Scheduling  
**Target City:** Al Madinah Al Munawwarah, Kingdom of Saudi Arabia  
**Architecture:** Zero-Paid API Deterministic Slot Engine  
**Implementation:** Node.js (ESM), SQLite (WAL mode), In-Memory Buffer Matrix  

---

## 1. Architectural Overview

At-home spa services require a fundamentally different scheduling paradigm than salon-based operations. Every booking incurs variable on-site service duration, mobile travel across urban sectors, setup/sanitization time, and practitioner assignment constraints.

The J BEAUTY Intelligent Scheduling Engine eliminates dependency on paid mapping or routing APIs by deploying a localized, sector-based deterministic travel engine paired with dynamic slot evaluation.

```
+-----------------------------------------------------------------------------------+
|                            GET /api/availability                                  |
|   Params: date (YYYY-MM-DD), duration (mins), neighborhood (Madinah District)    |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                          Validation & Operating Hours                             |
|   - Working days (Sun-Sat config)                                                 |
|   - Blocked dates check                                                           |
|   - Operating bounds: opening_time to closing_time                                 |
|   - Dynamic Lead Time check (lead_hours >= 2h from current time)                  |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                        Resource & Conflict Matrix                                 |
|   1. Query active bookings on date (confirmed, in_progress, active holds)         |
|   2. Query active staff practitioners                                             |
|   3. For each candidate slot (30-min intervals):                                  |
|      - Verify start_time + total_duration <= closing_time                         |
|      - Check Practitioner Feasibility:                                            |
|        * Prior appointment end_time + travel_buffer <= candidate_start            |
|        * Candidate finish_time + travel_buffer <= next appointment start          |
|      - Global Capacity Defense (overlapping active appointments < capacity)      |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                            Candidate Slots Return                                 |
|   { available_slots: ["09:00", "09:30", ...], total_slots_evaluated: N }          |
+-----------------------------------------------------------------------------------+
```

---

## 2. Total Duration Computation

A customer order frequently combines a primary service with one or more add-ons. The engine calculates duration deterministically:

$$\text{Total Duration} = \text{Primary Service Minutes} + \sum \text{Add-On Minutes}$$

- **Catalog Service Realism:**
  - Classic Pedicure: 45 min
  - Luxury Spa Pedicure: 75 min
  - Gel Polish Reapplication: 60 min
  - Colored French & Nail Art: 75 min
  - Full Body Relaxation Massage: 60 min
  - Deep Tissue / Hot Stone Massage: 75 min
  - Scalp & Hair Oil Massage Add-on: 20 min
  - Foot Scrub & Paraffin Add-on: 20 min

If a customer selects Classic Pedicure (45 min) + Scalp Massage Add-on (20 min), the candidate duration is 65 minutes. Any slot starting within 65 minutes of closing time is strictly excluded.

---

## 3. Al Madinah Geographic Travel Buffer Matrix

Madinah neighborhoods are mapped into four distinct geographic clusters:

| Sector | Key Neighborhoods Included |
| :--- | :--- |
| **Central / North (CN)** | سلطانة, العقيق, العيون, سيد الشهداء, القبلتين, الأزهري, الفتح, النصر |
| **West (W)** | العزيزية, الدفاع, السلام, الملك فهد, الهجرة, القصواء |
| **South (S)** | شوران, قباء, الحديقة, الرانوناء, بني ظفر, عروة |
| **East (E)** | باقدو, المبعوث, الخالدية, المطار, التلال, الإسكان |

### Sector-to-Sector Travel Time Matrix (Minutes)

| From \ To | Central / North | West | South | East |
| :--- | :---: | :---: | :---: | :---: |
| **Central / North** | 10 | 20 | 25 | 25 |
| **West** | 20 | 10 | 25 | 35 |
| **South** | 25 | 25 | 10 | 25 |
| **East** | 25 | 35 | 25 | 10 |

### Final Travel & Prep Buffer Calculation

$$\text{Total Buffer} = \text{Transit Time}(\text{Sector}_A, \text{Sector}_B) + \text{Prep/Sanitization Buffer (15m)}$$

- **Intra-Sector Appointment:** $10 + 15 = 25\text{ minutes}$
- **Adjacent-Sector Appointment:** $20 + 15 = 35\text{ minutes}$
- **Cross-City Appointment (West to East):** $35 + 15 = 50\text{ minutes}$

This prevents impossible consecutive bookings across Al Madinah while allowing tight, efficient scheduling within the same neighborhood.

---

## 4. Reservation Holds & Concurrency Protection

To prevent double-booking during receipt bank transfer:
1. When a customer submits a booking, the status is set to `pending_confirmation` and `payment_status: awaiting_receipt`.
2. A temporary hold is placed on that slot:
   $$\text{hold\_expires\_at} = \text{now}() + 1\text{ hour}$$
3. While the hold is active, `GET /api/availability` and concurrency checks treat the slot as occupied.
4. If the customer uploads a transfer receipt, the hold is extended by 24 hours (`payment_status: receipt_submitted`).
5. If no receipt is uploaded and the hold expires:
   - The slot is automatically released and returned to the availability pool.
   - Any late approval by operations is subjected to an atomic conflict check. If a collision occurred, the late approval is rejected with HTTP 409 (`تعذر تأكيد الحجز: حدث تعارض مع موعد آخر`).

---

## 5. Automated Staff Assignment (`autoAssignPractitioner`)

When operations verifies a payment, the platform automatically selects and assigns the optimal practitioner:
1. **Filter:** Staff users with `role: practitioner` who have not been disabled.
2. **Conflict Evaluation:** Filter out any practitioner with an overlapping confirmed appointment or insufficient travel buffer to/from the target neighborhood.
3. **Workload Balancing:** Among eligible practitioners, pick the one with the fewest assigned appointments on that calendar date.
4. **Distance Minimization:** If workloads are equal, select the practitioner whose prior or next appointment is in the same or nearest geographic sector.
5. **Execution:** The assignment is stored transactionally in `bookings.assigned_staff_id`.
