# Wealth Property Cost Formulas

This document describes the current mathematical model used by the Wealth Pathways workbook for:

- NSW transfer duty (`stamp duty`)
- NSW first-home-buyer transfer-duty relief
- lenders mortgage insurance (`LMI`)
- NSW annual land tax

The formulas below describe the code as it exists today. They are not a claim that the model is legally complete or lender-accurate in every edge case.

## 1. Notation

Let:

- `P` = purchase price of the property in AUD
- `d` = deposit percentage as a decimal
- `LVR` = loan-to-value ratio
- `L` = base loan amount before LMI capitalization
- `LMI` = lenders mortgage insurance premium
- `LV_share` = assumed land-value share of purchase price
- `LV` = estimated unimproved land value
- `T_sd(P)` = full NSW transfer duty before first-home-buyer relief
- `R_fhb(P)` = first-home-buyer duty reduction percentage
- `T_fhb(P)` = owner-occupier transfer duty after first-home-buyer relief
- `T_land(P)` = modeled NSW annual land tax

Constants currently hard-coded in the model:

- `FHB duty free limit = 800,000`
- `FHB duty phase-out limit = 1,000,000`
- `FHB low-deposit scheme price limit = 1,500,000`
- `NSW land tax threshold = 1,075,000`
- `NSW premium land tax threshold = 6,571,000`
- `house land value share = 0.62`
- `apartment land value share = 0.20`

## 2. Transfer Duty

### 2.1 Full NSW transfer duty schedule

The workbook models transfer duty as a piecewise function of `P`.

\[
T_{sd}(P)=
\begin{cases}
0.0125P & \text{if } 0 \le P \le 17{,}000 \\
212 + 0.015(P-17{,}000) & \text{if } 17{,}000 < P \le 37{,}000 \\
512 + 0.0175(P-37{,}000) & \text{if } 37{,}000 < P \le 99{,}000 \\
1{,}597 + 0.035(P-99{,}000) & \text{if } 99{,}000 < P \le 372{,}000 \\
11{,}152 + 0.045(P-372{,}000) & \text{if } 372{,}000 < P \le 1{,}240{,}000 \\
50{,}212 + 0.055(P-1{,}240{,}000) & \text{if } 1{,}240{,}000 < P \le 3{,}721{,}000 \\
186{,}667 + 0.07(P-3{,}721{,}000) & \text{if } P > 3{,}721{,}000
\end{cases}
\]

### 2.2 Step-by-step calculation

To calculate `stamp duty`:

1. Take the entered or inferred property value `P`.
2. Identify which price bracket contains `P`.
3. Use that bracket's base amount plus marginal rate.
4. Round to cents in code, though UI presentation typically rounds more coarsely.

### 2.3 Example

For `P = 900,000`:

\[
T_{sd}(900{,}000)=11{,}152+0.045(900{,}000-372{,}000)
\]

\[
=11{,}152+0.045(528{,}000)
\]

\[
=11{,}152+23{,}760=34{,}912
\]

So the baseline duty before any concession is:

\[
T_{sd}(900{,}000)=34{,}912
\]

## 3. First-Home-Buyer Duty Relief

This only applies in the model when:

- the path is owner-occupier, and
- the `firstHomeBuyerEligible` flag is enabled.

### 3.1 Reduction percentage

The duty reduction percentage is:

\[
R_{fhb}(P)=
\begin{cases}
0 & \text{if not eligible} \\
1 & \text{if } P \le 800{,}000 \\
1-\dfrac{P-800{,}000}{1{,}000{,}000-800{,}000} & \text{if } 800{,}000 < P < 1{,}000{,}000 \\
0 & \text{if } P \ge 1{,}000{,}000
\end{cases}
\]

The taper region simplifies to:

\[
R_{fhb}(P)=1-\dfrac{P-800{,}000}{200{,}000}
\]

### 3.2 Adjusted owner duty

The owner-path duty after first-home-buyer relief is:

\[
T_{fhb}(P)=T_{sd}(P)\left(1-R_{fhb}(P)\right)
\]

### 3.3 Example in taper zone

For `P = 900,000` and an eligible first-home buyer:

\[
R_{fhb}(900{,}000)=1-\dfrac{900{,}000-800{,}000}{200{,}000}
=1-\dfrac{100{,}000}{200{,}000}
=0.5
\]

So only half the baseline duty remains payable:

\[
T_{fhb}(900{,}000)=34{,}912 \times (1-0.5)=17{,}456
\]

For `P \le 800,000`, the model sets:

\[
T_{fhb}(P)=0
\]

For `P \ge 1,000,000`, the model sets:

\[
T_{fhb}(P)=T_{sd}(P)
\]

## 4. Lenders Mortgage Insurance

The model does not use a lender-specific LMI table. It uses a generic rate curve driven by `LVR`.

### 4.1 Deposit and LVR

Let:

\[
d=\text{deposit percentage}
\]

Then:

\[
LVR = 1-d
\]

The code clamps `d` into:

\[
0.05 \le d \le 1
\]

and clamps `LVR` into:

\[
0 \le LVR \le 0.95
\]

### 4.2 First-home-buyer low-deposit scheme shortcut

If the borrower is marked eligible and:

\[
P \le 1{,}500{,}000
\]

then the model forces:

\[
LMI = 0
\]

This is a simplified scheme rule in the workbook. It is not a full eligibility engine.

### 4.3 Base loan amount

If no exemption applies:

\[
L = P \cdot LVR
\]

### 4.4 LMI rate function

The model rate applied to the base loan is:

\[
r_{lmi}(LVR)=
\begin{cases}
0 & \text{if } LVR \le 0.80 \\
\dfrac{LVR-0.80}{0.05}\cdot 0.015 & \text{if } 0.80 < LVR \le 0.85 \\
0.015 + \dfrac{LVR-0.85}{0.05}\cdot 0.015 & \text{if } 0.85 < LVR \le 0.90 \\
0.03 + \dfrac{LVR-0.90}{0.05}\cdot 0.02 & \text{if } 0.90 < LVR \le 0.95
\end{cases}
\]

### 4.5 LMI premium

\[
LMI = L \cdot r_{lmi}(LVR)
\]

or equivalently:

\[
LMI = P \cdot LVR \cdot r_{lmi}(LVR)
\]

### 4.6 Capitalized opening loan balance

The workbook adds `LMI` to the starting loan:

\[
\text{opening loan balance}=P - (P \cdot d) + LMI
\]

which simplifies to:

\[
\text{opening loan balance}=P(1-d)+LMI
\]

### 4.7 Example

Take:

- `P = 900,000`
- `d = 0.10`

Then:

\[
LVR = 1-0.10 = 0.90
\]

\[
L = 900{,}000 \cdot 0.90 = 810{,}000
\]

At `LVR = 0.90`, the rate is:

\[
r_{lmi}(0.90)=0.03
\]

So:

\[
LMI=810{,}000 \cdot 0.03=24{,}300
\]

And the opening loan becomes:

\[
900{,}000 - 90{,}000 + 24{,}300=834{,}300
\]

## 5. Annual Land Tax

The workbook models NSW annual land tax using an estimated land value rather than actual land-title or Valuer General data.

### 5.1 Estimated land value

For each property type, the model assumes:

\[
LV = P \cdot LV_{share}
\]

where:

- for houses:

\[
LV_{share}=0.62
\]

- for apartments:

\[
LV_{share}=0.20
\]

### 5.2 Annual land tax function

The modeled annual land tax is:

\[
T_{land}(P)=
\begin{cases}
0 & \text{if } LV \le 1{,}075{,}000 \\
100 + 0.016(LV-1{,}075{,}000) & \text{if } 1{,}075{,}000 < LV \le 6{,}571{,}000 \\
T_{premium\_base} + 0.02(LV-6{,}571{,}000) & \text{if } LV > 6{,}571{,}000
\end{cases}
\]

where:

\[
T_{premium\_base}=100 + 0.016(6{,}571{,}000-1{,}075{,}000)
\]

Compute that base:

\[
6{,}571{,}000-1{,}075{,}000 = 5{,}496{,}000
\]

\[
0.016 \cdot 5{,}496{,}000 = 87{,}936
\]

\[
T_{premium\_base}=88{,}036
\]

So the premium segment is:

\[
T_{land}(P)=88{,}036+0.02(LV-6{,}571{,}000)
\]

### 5.3 Example: house

Let:

- `P = 2,000,000`
- house land share `= 0.62`

Then:

\[
LV = 2{,}000{,}000 \cdot 0.62 = 1{,}240{,}000
\]

This sits above the standard threshold but below the premium threshold, so:

\[
T_{land}(2{,}000{,}000)=100+0.016(1{,}240{,}000-1{,}075{,}000)
\]

\[
=100+0.016(165{,}000)
\]

\[
=100+2{,}640=2{,}740
\]

### 5.4 Example: apartment

Let:

- `P = 2,000,000`
- apartment land share `= 0.20`

Then:

\[
LV = 2{,}000{,}000 \cdot 0.20 = 400{,}000
\]

Since:

\[
400{,}000 < 1{,}075{,}000
\]

the model gives:

\[
T_{land}(2{,}000{,}000)=0
\]

## 6. Where the Model Introduces Variance

This section explains approximation error and model variance, not statistical variance from simulation.

### 6.1 Transfer duty variance

Transfer duty is the most rigid of the three formulas because it is a direct bracket schedule on `P`.

Potential variance sources:

- concessions or exemptions not modeled beyond the current NSW first-home-buyer rule
- legal entity differences
- off-the-plan or special-duty treatments
- future threshold changes

Mathematically, there is little internal variance in the formula itself; the main risk is policy drift or missing legal branches.

### 6.2 First-home-buyer variance

The owner-path duty concession is modeled as a deterministic linear taper:

\[
R_{fhb}(P)=1-\frac{P-800{,}000}{200{,}000}
\]

Variance sources:

- the model uses a single eligibility flag, not a full legal eligibility test
- it assumes current NSW thresholds remain correct
- it does not model non-price qualification criteria

### 6.3 LMI variance

LMI is the highest-variance model component because the premium is not calculated from a real insurer table.

Variance sources:

- lender-specific pricing differences
- borrower-specific risk adjustments
- owner-occupier versus investor distinctions not explicitly priced in the curve
- loan amount bands
- genuine savings rules
- profession-based waivers
- scheme eligibility details beyond the price cap

Mathematically, the model assumes:

\[
LMI \approx P(1-d)\cdot r_{lmi}(1-d)
\]

That is a smooth heuristic approximation, not a market quote.

### 6.4 Land tax variance

Land tax is also high variance because the model does not observe real land value directly.

It assumes:

\[
LV=P \cdot LV_{share}
\]

with fixed shares:

- `0.62` for houses
- `0.20` for apartments

Variance sources:

- true unimproved land value can diverge sharply from purchase price share
- site value varies by suburb, density, zoning, and lot characteristics
- apartment unit entitlement is not modeled
- exemptions, aggregation rules, and ownership structure are not modeled

This means the dominant source of error is:

\[
\varepsilon_{LV}=LV_{actual}-LV_{modeled}
\]

and land-tax error follows from that:

\[
\varepsilon_{landtax}=T_{land}(LV_{actual})-T_{land}(LV_{modeled})
\]

## 7. Practical Interpretation

If you rank the current formulas by likely real-world accuracy:

1. `stamp duty`
2. `first-home-buyer duty reduction`
3. `land tax`
4. `LMI`

`Stamp duty` is the cleanest schedule-based calculation. `Land tax` and `LMI` are more approximate because they depend on hidden or lender-specific variables that the workbook does not currently model.

## 8. Code Mapping

Current implementation locations:

- `src/wealth/finance.js`
  - `estimateNswTransferDuty`
  - `getFirstHomeBuyerStampDutyReductionPct`
  - `estimateLmi`
  - `getLmiRate`
  - `estimateNswAnnualLandTax`
- `src/project-pages/WealthPathwaysWorkbookDetail.vue`
  - syncs auto-filled costs when purchase price changes
- `src/components/wealth/WealthInputWorkbook.vue`
  - exposes the editable fields and uses the derived purchase-plan outputs
