# Wealth Property Cost Formulas (Corrected NSW Version)

This document provides a corrected set of formulas and implementation notes for NSW property cost modelling.

Verified against official NSW and Australian Government sources retrieved on 1 April 2026 (Australia/Sydney).

This version separates:

- exact or standards-aligned NSW formulas, and
- non-standard estimates that must not be labelled as NSW statutory formulas.

## 1. Scope and framing

This document covers:

- NSW transfer duty
- NSW First Home Buyers Assistance Scheme (FHBAS) transfer-duty relief
- Lenders Mortgage Insurance (LMI)
- NSW annual land tax

Important distinction:

- Transfer duty and land tax are statutory NSW calculations, but only when the correct statutory inputs are used.
- FHBAS transfer-duty relief is a NSW concession with price thresholds and eligibility conditions.
- LMI is **not** a NSW tax or NSW standard formula. It is lender/insurer specific and may only be estimated unless a lender quote or scheme-backed no-LMI outcome is known.

## 2. Notation

Let:

- `P` = contract purchase price in AUD
- `MV` = market value in AUD
- `V` = dutiable value in AUD, where `V = max(P, MV)`
- `d` = deposit percentage as a decimal
- `LVR` = loan-to-value ratio, where `LVR = 1 - d`
- `L` = base loan amount before any capitalised LMI, where `L = P * LVR`
- `T_sd(V)` = full NSW transfer duty before any concession
- `T_fhb_home(V)` = NSW transfer duty after FHBAS relief for a new or existing home
- `T_fhb_land(V)` = NSW transfer duty after FHBAS relief for vacant land
- `LV_avg` = average unimproved land value used for land tax purposes
- `T_land(LV_avg)` = NSW annual land tax

Conventions:

- Transfer duty is assessed on `V`, not simply on purchase price.
- Revenue NSW standard transfer duty is calculated using rates expressed as dollars per `$100 or part` over the threshold.
- This means exact implementation should use `ceil(...)` on the relevant `$100` block count, not a fully continuous linear formula.
- Thresholds and premium-duty cutoffs are date-sensitive and should be versioned by transaction date.

## 3. NSW transfer duty (exact 2025-26 residential schedule)

### 3.1 When this schedule applies

Use this schedule for residential transfer-duty calculations for transactions with the 2025-26 rate settings:

- standard transfer-duty thresholds effective from `1 July 2025`
- premium property duty threshold of `3,721,000` effective from `1 July 2025 to 30 June 2026`

Use `V = max(P, MV)`.

### 3.2 Exact standard transfer duty formula

For residential property, define:

```text
T_sd(V) =
    max(20, 1.25 * ceil(V / 100))
        if 0 < V <= 17,000

    212 + 1.50 * ceil((V - 17,000) / 100)
        if 17,000 < V <= 37,000

    512 + 1.75 * ceil((V - 37,000) / 100)
        if 37,000 < V <= 99,000

    1,597 + 3.50 * ceil((V - 99,000) / 100)
        if 99,000 < V <= 372,000

    11,152 + 4.50 * ceil((V - 372,000) / 100)
        if 372,000 < V <= 1,240,000

    50,212 + 5.50 * ceil((V - 1,240,000) / 100)
        if 1,240,000 < V <= 3,721,000
```

For residential land above the premium threshold:

```text
T_sd(V) = 186,667 + 7.00 * ceil((V - 3,721,000) / 100)
    if V > 3,721,000
```

### 3.3 Important legal notes

- Duty is based on the higher of sale price or market value.
- Premium property duty applies to residential land above the premium threshold.


### 3.4 Exact example

For `V = 900,000`:

```text
T_sd(900,000)
= 11,152 + 4.50 * ceil((900,000 - 372,000) / 100)
= 11,152 + 4.50 * 5,280
= 11,152 + 23,760
= 34,912
```

So:

```text
T_sd(900,000) = 34,912
```

## 4. NSW First Home Buyers Assistance Scheme (FHBAS)

### 4.1 Eligibility warning

The concession is **not** determined only by an owner-occupier flag.

At a minimum, the claimant generally must satisfy eligibility requirements around:

- age
- citizenship or permanent residency
- first-home status
- property type and acquisition structure
- moving into the property within 12 months
- living in the property for at least 12 continuous months

Implementation should therefore separate:

- `fhbas_price_eligible`, and
- `fhbas_full_eligibility_confirmed`

A workbook may estimate the concession from price only, but that should be labelled as an eligibility-dependent result.

### 4.2 Homes: current thresholds

For transactions entered into on or after `1 July 2025` for a new or existing home:

- if `V <= 800,000`: full exemption
- if `800,000 < V < 1,000,000`: reduced transfer duty
- if `V >= 1,000,000`: no FHBAS duty concession

### 4.3 Homes: corrected reduced-duty formula

Let:

```text
D_800 = T_sd(800,000)
```

Using the 2025-26 transfer-duty schedule:

```text
D_800 = 30,412
```

A formula that reproduces the current official reduced-duty examples is:

```text
T_fhb_home(V) = 0
    if eligible and V <= 800,000

T_fhb_home(V) = T_sd(V) - D_800 * (1,000,000 - V) / 200,000
    if eligible and 800,000 < V < 1,000,000

T_fhb_home(V) = T_sd(V)
    if not eligible or V >= 1,000,000
```

Substituting `D_800 = 30,412`:

```text
T_fhb_home(V) = T_sd(V) - 30,412 * (1,000,000 - V) / 200,000
    for eligible buyers with 800,000 < V < 1,000,000
```

This corrected formula replaces the earlier incorrect approach that simply multiplied full duty by a linear percentage taper.

### 4.4 Homes: example

For `V = 900,000` and a fully eligible buyer:

```text
T_sd(900,000) = 34,912
```

```text
Concession amount = 30,412 * (1,000,000 - 900,000) / 200,000
                  = 30,412 * 0.5
                  = 15,206
```

```text
T_fhb_home(900,000) = 34,912 - 15,206 = 19,706
```

This matches the published current NSW example.

## 5. Lenders Mortgage Insurance (LMI)

### 5.1 Critical correction

LMI must **not** be labelled as a NSW standard formula.

LMI is not set by NSW legislation. It is typically determined by:

- lender policy
- mortgage insurer pricing tables
- loan amount bands
- LVR bands
- borrower profile
- owner-occupier vs investor status
- genuine savings and waiver rules
- profession-based waivers
- government guarantee schemes

### 5.2 Recommended standards-aligned treatment


#### Mode: clearly labelled estimate mode

If the product still requires a rough estimate before a lender quote exists, keep a separate function such as:

```text
LMI_estimate = L * r_est(LVR, product_type, occupancy_type, loan_band)
```

but label it clearly as:

- `estimated LMI`
- `not a lender quote`
- `not a NSW statutory formula`

### 5.3 Australian Government 5% Deposit Scheme note

The earlier shortcut:

```text
if first-home-buyer eligible and P <= 1,500,000 then LMI = 0
```

is not correct as a general NSW rule.

As at April 2026, the Australian Government 5% Deposit Scheme uses:

- NSW capital city and designated regional-centre cap: `1,500,000`
Includes:
Capital city
Sydney (Greater Sydney region)
Designated NSW regional centres (explicit list)
Illawarra
Newcastle
Lake Macquarie

- NSW other areas cap: `800,000`

and still depends on additional conditions such as:

- first-home-buyer or other scheme eligibility category
- owner-occupier use
- principal-and-interest repayments
- the property being at or below the relevant location-specific cap

```

### 5.4 Capitalised opening loan balance

If LMI is capitalised into the loan, the opening balance is:

```text
opening_loan_balance = L + LMI = P * (1 - d) + LMI
```

This relationship is still correct, but the LMI input itself should come from either a quote or a clearly labelled estimate.

## 6. NSW annual land tax

### 6.1 Critical correction

The earlier method based on:

```text
estimated_land_value = purchase_price * fixed_land_share
```

It can be kept only as an internal estimate.

### 6.2 Current 2026 thresholds and rates

For the 2026 land-tax year:

- general threshold: `1,075,000`
- premium threshold: `6,571,000`

The current formula is:

```text
T_land(LV_avg) = 0
    if LV_avg <= 1,075,000

T_land(LV_avg) = 100 + 0.016 * (LV_avg - 1,075,000)
    if 1,075,000 < LV_avg <= 6,571,000

T_land(LV_avg) = 88,036 + 0.02 * (LV_avg - 6,571,000)
    if LV_avg > 6,571,000
```

### 6.3 Example using official 3-year-average logic

If the combined average taxable land value is:

```text
LV_avg = 1,100,000
```

then:

```text
T_land(1,100,000) = 100 + 0.016 * (1,100,000 - 1,075,000)
                  = 100 + 0.016 * 25,000
                  = 100 + 400
                  = 500
```

### 6.4 Principal place of residence correction

A principal place of residence is generally exempt from land tax if the exemption criteria are met.

From the `2026` land-tax year onward, the people living in the property must collectively own at least `25%` to keep claiming the principal place of residence exemption.

Accordingly, a standards-aligned workflow should first evaluate exemption status:

```text
If principal_place_of_residence_exempt:
    T_land = 0
Else:
    apply the land-tax formula to the relevant taxable aggregated value
```

## 7. Recommended implementation structure

Use the following separation in code and UI:
