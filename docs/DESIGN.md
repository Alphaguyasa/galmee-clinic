# DESIGN.md: Galmee Clinic

Change this file first, then the code.

## Brief

- **Subject:** a small private clinic in Shashamane. A reception window, a bench of waiting patients, a back room of manila folders with a card number written on each tab.
- **Audience:** the receptionist (finds or registers a patient, one thumb, a queue in front of her), the doctor (reads history between patients) and the lab technician (enters results).
- **Primary job:** type a name, phone or card number and get the whole history of that patient.

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| `--ledger` | `#1B3F6B` | Dominant. Record-book blue: header bar, primary action. White on it is 10.7:1. |
| `--floor` | `#F1F4F7` | Page background. |
| `--ink` | `#131A24` | Text. |
| `--rule` | `#D3DBE4` | Borders and hairlines. |
| `--manila` | `#E9CF9A` | Accent, used only for the card-number tab. Ink on it is 11.5:1. |
| `--owed` | `#B42318` | Money owed, errors. 6.6:1 on white. |

Queue status is never colour alone: waiting, with doctor, lab and done each have a word and an icon. Money owed always says "owes" beside the figure.

## Type

- **IBM Plex Sans** (English and Afaan Oromo): the plain look of a printed record card, with digits that stay distinct in a lab value. Numbers use tabular figures (`.num`).
- **Noto Sans Ethiopic** for Amharic, 400/600.
- Self-hosted with `next/font/local`.
- Scale: 14 / 16 / 20 / 24; the card number is 18 bold.

## Layout (360 px first)

```
+----------------------------+
| Clinic name      [lang][x] |  ledger-blue header
+----------------------------+
| [ Name, phone or card no ] |
+----------------------------+
| Today (9 waiting)          |
| [0142] Abebe K.   Waiting  |  manila tab, name, status word + icon
| [0087] Sara T.    Lab      |
+----------------------------+
|     [ Register patient ]   |  sticky above tab bar
+----------------------------+
| Queue Patients Book Lab More|
+----------------------------+
```

Desktop: sidebar left, queue and search share one column, max 64 rem wide.

## The one bold thing

The folder tab. Every card number on screen is set like the tab of a manila folder: ink on manila, square bottom corners, flush to the top of its row. Everything else stays flat and quiet: hairline rules, no shadows, 6 px corners.

## Reviewed against generic defaults

Not cream and terracotta, not black and acid green, no gradient washes, no ALL-CAPS eyebrows, no identical soft-shadow cards. Manila appears only on card numbers so it keeps meaning. No red crosses or stethoscope art.
