# Data model

There is no database in this repository. There is a schema, and it lives in the application because
the vendor's kernel discovers it from a declaration rather than from a migration.

## Where data lives, and for how long

| Data | Where | Lifetime |
|---|---|---|
| The item bank, the fault lines, the lessons | `src/lib/domain/` — compiled into the build | The life of the build |
| The current session's answers | React state, in the browser | Until the tab closes |
| A student's fault profile | The Neural Pulse virtual database, with `localStorage` as a floor | Until deleted |
| A completed session record | As above | Until deleted |

Nothing is sent anywhere unless a Neural Pulse key is connected, and when one is, the interface says
so in the masthead. With no key, the entire product runs on the device.

## The tables

Declared once, through `action_type: "create_schema"`, on the first call that needs them. LivingDNA
registers them from that declaration, so there is no migration file and no schema version to bump.

### `fault_profiles` — the cognitive memory

One row per student, holding the belief state at the end of their most recent session.

| Column | Type | Why |
|---|---|---|
| `student_id` | text, primary | A slug of the name the student typed. Deliberately not an account. |
| `student_label` | text | What to call them on screen. |
| `beliefs` | json | Fault id to probability, 0–1. The whole state, so the next session can say what closed. |
| `answered` | int | How many questions reached that state. |
| `primary_fault` | text | The fault that was live, or null. |
| `updated_at` | text | ISO timestamp. |

`beliefs` is stored as JSON rather than as twenty columns for a specific reason: **the fault set is
expected to grow**, and a fault line added next month should not require a schema change to record. A
row written before the fault existed simply has no entry for it and is read as "not yet tested", which
is the correct interpretation.

### `sessions` — the history

Append-only. One row per completed diagnosis.

| Column | Type | Why |
|---|---|---|
| `student_id` | text | Whose session. |
| `asked` | json | The item ids, **in the order the selector chose them**. This is the adaptive trace: it is what makes "no two students see the same sequence" checkable rather than asserted. |
| `correct` | int | How many answers were true. |
| `primary_fault` | text | What was diagnosed, or null. |
| `finished_at` | text | ISO timestamp. |

Sessions are append-only because the interesting question later is not the latest state but the
trajectory: which fault took three attempts to close, and which one came back.

## Why there is no upsert

The virtual database documents insert, select, update and delete, but not an upsert. Rather than guess
at how rows come back and rely on ordering, `saveProfile` does it explicitly: select, then update if
the row exists, otherwise insert. Two calls instead of one, and no assumption about what the kernel
returns in what order.

It also means the write is idempotent in the way that matters. A retry after a timeout either updates
the row that was already written or inserts the one that was not.

## The local floor

`localMemory` writes the same profile to `localStorage`, and `resilientMemory` writes there
**unconditionally and first**, before attempting the remote write. A profile is a student's history;
losing it to a failed write would be worse than a duplicate row.

The difference the live layer makes is real and worth stating plainly: local storage is per device.
A fault found on a school machine in September is on that machine in October, and nowhere else.
Persisting across devices is the specific thing the Neural Pulse layer buys, and it is why the
interface says "this device only" rather than pretending the map is portable.

## What is never stored

- No free-text reasoning is persisted. It is read during a session to produce evidence weights, the
  weights are kept, and the sentence is not. The reasoning a student writes is the most sensitive
  thing the product touches and the least useful to keep.
- No name beyond the label the student typed, and no email.
- No answer history beyond the fault ids in `asked`. The options a student chose are used to produce
  the profile and are then dropped, so the stored record cannot be used to re-derive their individual
  answers.
