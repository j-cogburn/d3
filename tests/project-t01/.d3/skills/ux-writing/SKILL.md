---
name: ux-writing
description: Guides agents through writing microcopy — button labels, error messages, empty states, onboarding copy, tooltips, and confirmation dialogs. Use when writing any text that appears in the UI, evaluating existing copy for clarity, or designing a new user flow that requires copy.
---

# UX Writing

## Overview

UX writing is the design of the words in a product. Bad microcopy creates friction, confusion, and support tickets. Good microcopy is invisible — users read it, understand immediately, and act.

The four principles:
1. **Clear** — the user understands it on the first read
2. **Concise** — no words that don't earn their place
3. **Useful** — tells the user something they need to know or do
4. **Conversational** — sounds like a knowledgeable person, not a legal document

---

## When to Use

- Writing copy for any new UI component or screen
- Auditing existing microcopy for clarity and tone
- Designing error messages, empty states, or confirmation dialogs
- Onboarding flow copy
- Any time copy was flagged in a UX audit as confusing or unhelpful

---

## Pattern library

### Button labels

Formula: **[Verb] [Object]**

```
✓ Save changes
✓ Delete account
✓ Send invitation
✓ Export as CSV
✓ Continue
✓ Try again

✗ OK
✗ Submit
✗ Yes
✗ Proceed
✗ Click here
```

Rules:
- Labels must describe the action, not confirm it ("Delete account" not "Yes, delete it")
- Destructive actions must specify what is being destroyed
- "Cancel" always closes without action — never redefine it
- Primary CTA on any screen should be the single most important action

### Error messages

Formula: **[What happened] + [Why] + [How to fix it]**

```
✗ "Invalid input"
✗ "An error occurred"
✗ "Something went wrong"

✓ "Email address is already in use. Log in instead, or reset your password."
✓ "Password must be at least 8 characters. You've entered 5."
✓ "We couldn't save your changes — you're offline. Reconnect and try again."
✓ "File too large. Maximum size is 5MB — this file is 8.2MB."
```

Rules:
- Never blame the user ("You entered an invalid email" → "This email address isn't valid")
- Always explain what's wrong AND how to fix it
- Be specific about constraints (not "password is too short" but "at least 8 characters — you've entered 5")
- Place error text immediately below the field that caused it
- Use plain language — no technical error codes in the UI

### Empty states

Formula: **[What's missing] + [Why it matters] + [Call to action]**

```
✗ "No data"
✗ "Nothing here yet"
✗ "No results found"

✓ "No portfolios yet
    Create your first portfolio to start tracking performance.
    [+ Create portfolio]"

✓ "No matching results
    Try a different search term, or browse all [category].
    [Clear search]  [Browse all]"

✓ "You're all caught up ✓
    New notifications will appear here."
```

Types of empty state:
- **First-use empty**: user hasn't done anything yet → show value + CTA
- **No results**: search or filter returned nothing → suggest alternatives
- **Completed state**: user has cleared all items → celebrate + what's next
- **Error state**: data couldn't load → explain + retry action

### Confirmation dialogs

Formula: **[Consequence, not question] + [Specific details] + [Two clear actions]**

```
✗ "Are you sure?"
   [Cancel] [OK]

✗ "Are you sure you want to delete this item?"
   [No] [Yes]

✓ "Delete project 'Alpha Launch'?
    This will permanently delete the project and all 24 tasks.
    This cannot be undone."
   [Cancel] [Delete project]

✓ "Remove Sarah Chen from the team?
    She will lose access immediately and be notified by email."
   [Cancel] [Remove member]
```

Rules:
- Confirm buttons must label the action, not "OK" or "Yes"
- Describe the specific, irreversible consequence
- "Cancel" always comes before the confirming action
- Destructive confirm buttons use the danger variant

### Onboarding copy

Formula: **Welcome → Orient → First action → Value realisation**

```
Welcome screen:
  Headline: [Outcome, not feature] — "Start making smarter investment decisions"
  Subhead:  One sentence on how — "AlphaLab analyses your portfolio in real time"
  CTA:      First step — "Set up your portfolio"

Step copy:
  Progress: "Step 2 of 4"
  Headline: [Task] — "Connect your brokerage"
  Body:     [Why it matters] — "We'll import your positions automatically — no manual entry needed"
  CTA:      [Next action] — "Connect Fidelity"
  Skip:     If skippable — "I'll do this later"
```

### Tooltips and helper text

```
Tooltip (on hover/focus):
  ✓ "Sharpe ratio measures return relative to risk. Higher is better."
  ✗ "Learn more about this metric" (sends users away)
  Max: 2 sentences. Always answers "what is this?" or "when should I use this?"

Helper text (below an input):
  ✓ "Use your company email — this links your account to your team."
  ✓ "Minimum 8 characters, including one number."
  ✗ "Required field" (they can see the asterisk)
  
Placeholder text (inside an input):
  ✓ "e.g. john@company.com"
  ✓ "Search by ticker or company name"
  ✗ "Email address" (the label already says this)
  Rule: placeholder disappears on type — don't put instructions there, put them in helper text
```

### Loading copy

```
Short operations (<2s):   "Loading..." or "Saving..."
Longer operations (2–10s):"Analysing your portfolio..." / "Importing 247 positions..."
Progress operations:      "Uploading (3 of 5 files)..." / "Step 2 of 3: Verifying data"
After completion:         "Saved ✓" / "Portfolio updated" / "All changes saved"
```

---

## Voice and tone

Voice is consistent. Tone adapts to context.

| Context | Tone | Example |
|---|---|---|
| Normal UI | Helpful, direct | "Save changes" |
| Success | Warm, brief | "Portfolio created ✓" |
| Error | Calm, helpful | "Couldn't connect — check your network and try again" |
| Destructive action | Serious, precise | "This permanently deletes all data" |
| Empty first-use | Encouraging | "Set up your first portfolio to get started" |
| Empty no-results | Neutral, helpful | "No results for 'AAPL' — check the ticker symbol" |

---

## Microcopy audit checklist

When auditing existing copy:

```
For every piece of UI text, ask:
  ✓ Does it tell the user what to do or what happened?
  ✓ Can it be shorter without losing meaning?
  ✓ Is it in active voice? ("Save failed" not "The save operation was unsuccessful")
  ✓ Does it avoid jargon the user wouldn't know?
  ✓ For errors: does it say what went wrong AND how to fix it?
  ✓ For buttons: does the label describe the action?
  ✓ For empty states: does it offer a path forward?
```

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "The user will figure it out from context" | Users read error messages in moments of frustration. "Figure it out from context" is the source of support tickets. |
| "We can polish the copy later" | Copy is part of the design. Shipping with placeholder copy means shipping a broken experience. |
| "Technical users don't need hand-holding" | Even technical users don't know what "Error 403" means in terms of what to do next. All users deserve useful error messages. |
| "The button label fits in the space" | "OK" fits in any space. It communicates nothing. Label buttons with the action. |

---

## Red Flags

- Any error message that says only "Error", "Invalid input", "Something went wrong", or "An error occurred"
- Empty states that say only "No data" or "Nothing here yet"
- Confirmation dialogs with "Yes/No" or "OK/Cancel" as the primary actions
- Placeholder text used as a substitute for a field label
- Tooltip text that says "Click to learn more"
- Loading states with no copy at all

---

## Verification

- [ ] Every error message specifies what went wrong and how to fix it
- [ ] Every button label is a verb + object (not OK, Submit, Yes)
- [ ] Every empty state offers a path forward
- [ ] Every confirmation dialog for a destructive action describes the consequence
- [ ] No placeholder text contains instructions (those belong in helper text)
- [ ] All copy reviewed for active voice and plain language
