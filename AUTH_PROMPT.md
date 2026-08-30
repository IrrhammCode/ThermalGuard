# AUTH PROMPT — ATA² (Welcome · Sign in · Sign up)

Copy this **entire file** into a new Cursor chat. Build **auth screens only**. Do not rebuild Map / Hold / Swarm in this pass. Do not change Python under `backend/`. Do not invent a second visual theme.

Human note (Bahasa): dulu spec produk bilang “no login”. Sekarang kita **gate dulu** biar app terasa finished. Tema **satu**: dark ops ATA² (bukan startup pastel, bukan Google Material). Setiap halaman di bawah adalah spec penuh — kerjakan **satu tema**, halaman **sangat detail**. Copy di chrome **English** (juri).

---

## 0. Scope of this pass

You are a coding agent. Ship a native **iPhone 16 + Expo Go (SDK 57)** auth flow that looks like the same product as Thermal Hold.

**In scope**

- Native splash until session hydrates
- Four screens: **Welcome**, **Sign in**, **Sign up**, **Forgot password**
- One confirmation screen: **Check email** (after forgot-password submit)
- Local session (SecureStore). Python API has **no** `/login`. Do not add FastAPI auth.
- After a valid session: `router.replace('/(tabs)')` into the **existing** tabs (even if they are still a sketch)
- Judge escape hatch on Welcome only (90s pitch cannot die on a form)

**Out of scope**

- Map overlays, Hold math, Swarm animation
- Google / Apple / Facebook SSO (Expo Go friction; second visual language)
- Real email delivery, SMS OTP, magic links, OAuth
- Light mode, web as a target, Indonesian chrome
- Changing FortyGuard numbers or `backend/`

**Done when**

- Cold launch: splash → Welcome (logged out) or tabs (logged in)
- Sign in / Sign up persist a session and land on tabs
- Sign out (temporary button on Hold or a tiny account chip later) returns to Welcome — if you do not add sign-out UI yet, expose `signOut` on the auth context and a hidden long-press on the Welcome wordmark is **not** enough; add a **Sign out** text button on the existing Hold tab header, top-right, muted, SF Pro 13. That is the only non-auth-screen edit allowed.
- `npx tsc --noEmit` clean aside from template noise
- No second color palette. No Inter. No emoji in chrome.

---

## 1. One theme (do not drift)

This is not a “log in to continue” SaaS. It is an **ops gate** for a heat-intelligence tool. Quiet, dark, one accent for primary actions, heat only for errors.

### 1.1 Tokens (exact)

Use `constants/theme.ts`. If a token is missing, add it there — do not scatter hex in screens.

| Token | Hex | Auth use |
|---|---|---|
| `bg` | `#07090C` | screen background |
| `surface` | `#12171E` | fields, cards |
| `surface2` | `#1A212B` | field focused fill |
| `border` | `#2A3340` | field rest, hairlines |
| `text` | `#F4F1EA` | titles, input text |
| `muted` | `#9AA3B2` | captions, placeholders, secondary links |
| `cool` | `#4CC9F0` | links, focused border, cursor tint |
| `hold` / `cool2` | `#2EC4B6` | **primary buttons** (enter / create) |
| `heat` | `#FF6B35` | errors, invalid border |
| `warn` | `#FFB703` | password-strength caution only, never primary CTA |

Do **not** use heat orange as the Sign in button. Heat = trap / error. Hold teal = the product action (get off the sun / enter the hold).

### 1.2 Type (SF Pro via system font)

| Role | Size | Weight | Color | Tracking |
|---|---|---|---|---|
| Eyebrow | 11 | 600 | `muted` | +0.8 |
| Screen title | 28 | 600 | `text` | −0.4 |
| Deck / one-liner | 15 | 400 | `muted` | 0 |
| Field label | 12 | 600 | `muted` | +0.4 |
| Field value | 17 | 400 | `text` | 0 |
| Helper / error | 13 | 400 | `muted` or `heat` | 0 |
| Primary button | 17 | 600 | `#07090C` on hold fill | 0 |
| Text button | 15 | 600 | `cool` | 0 |
| Legal / micro | 11 | 400 | `muted` | 0 |

Line height: title 34, deck 22, body 20. No Inter, no Pacifica, no display serif.

### 1.3 Motion & haptics

- Screen push: default iOS stack (Welcome → Sign in is a push).
- Primary tap: `ImpactLight`. Error shake: `NotificationError`. Success session: `NotificationSuccess` once, then navigate.
- No Lottie. No particle heat. Optional: 1px hold-teal hairline under the wordmark, opacity 0.4, no animation loop.
- Keyboard: `KeyboardAvoidingView` `padding` on iOS; screens must remain usable with the keyboard open (primary button visible or scroll to it).

### 1.4 What the chrome must say (brand)

One-liner (Welcome only, and as tiny footer on Sign in):

> ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun.

City lock: **Phoenix, AZ** — never Singapore. Never “cool corridor login”.

### 1.5 Shared field anatomy (every form page)

All text fields share one component, e.g. `components/auth/AuthField.tsx`.

**Rest**

- Height 52
- Radius 12
- Fill `surface`
- Border 1 `border`
- Padding horizontal 16
- Label 8pt above the field, not floating inside (no Material floating label)

**Focus**

- Border `cool`
- Fill `surface2`
- Cursor `cool`

**Error**

- Border `heat`
- Helper 6pt below, color `heat`, one line
- Do not turn the label heat unless the field is invalid

**Password**

- Trailing 44×44 hit target, SF Symbol `eye` / `eye.slash`, tint `muted`
- `secureTextEntry` default true
- `textContentType` / `autoComplete` set per page below

**Primary button** (`components/auth/AuthButton.tsx`)

- Height 52, radius 12, full width
- Fill `hold` (`#2EC4B6`), label `#07090C`
- Disabled: fill `#2EC4B6` at 28% opacity, label still `#07090C`, no press
- Loading: replace label with small `ActivityIndicator` color `#07090C`, keep height, do not shrink
- Disabled until the page’s enable-rule is met (specified per page)

**Secondary text button**

- No fill, color `cool`, 44pt min height

---

## 2. Architecture (Expo Router SDK 57)

Read [Authentication in Expo Router](https://docs.expo.dev/router/advanced/authentication/) and [Protected routes](https://docs.expo.dev/router/advanced/protected/). Use **`Stack.Protected`**, not a manual `router.replace` loop in `useEffect` as the source of truth.

### 2.1 File tree (create these)

```
app/
  _layout.tsx                 # SessionProvider + SplashScreenController + Protected stacks
  (auth)/
    _layout.tsx               # Stack, headerShown false, bg #07090C
    index.tsx                 # Welcome
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx
    check-email.tsx
  (tabs)/                     # already exists — protect this group
    ...
context/
  Auth.tsx                    # NEW — do not reuse context/Session.tsx (that file is trip/map state)
lib/
  auth.ts                     # validation + local user store helpers
  useStorageState.ts          # Expo docs pattern (SecureStore native)
components/auth/
  AuthField.tsx
  AuthButton.tsx
  AuthScreen.tsx              # SafeArea + KeyboardAvoidingView + scroll
```

Rename is allowed: if you keep `context/Session.tsx` for trips, **do not** put `signIn` there. Auth lives in `context/Auth.tsx` + `useAuth()`.

### 2.2 Root layout (behavior)

- `SplashScreen.preventAutoHideAsync()` until `useAuth().isLoading === false`
- Then hide splash
- `Stack.Protected guard={!!session}` → `(tabs)`
- `Stack.Protected guard={!session}` → `(auth)`
- Logged-in user who hits `/sign-in` is redirected to tabs
- Logged-out user who hits a tab deep link is redirected to Welcome (`(auth)/index`)

### 2.3 Session model (local, hackathon)

Python has no users. Persist JSON in SecureStore key `ata2.session`.

```ts
type Session = {
  userId: string;       // uuid
  email: string;
  name: string;
  role: "operator" | "judge";
  createdAt: string;    // ISO
};
```

**Users store** (SecureStore key `ata2.users`): array of `{ userId, email, name, passwordHash }`.

Password: do **not** store plaintext. Use a trivial SHA-256 hex of `email + ":" + password` via `expo-crypto` (`Crypto.digestStringAsync`). This is not bank-grade; it is enough so a demo device dump is not a password list. Document that in a one-line comment.

**Rules**

- Sign up: reject if email already in `ata2.users`
- Sign in: match email (case-insensitive trim) + hash
- Forgot password: **do not** reset the password in this pass. Only show Check email. (No inbox exists.)
- Judge skip: writes a session with `role: "judge"`, `email: "judge@ata2.demo"`, `name: "Hackathon judge"` — **no** password, **not** inserted into `ata2.users` (so it cannot be used on Sign in unless they Sign up)

Demo credentials **on Sign in only**, as a muted one-line under the button (not a second palette):

`Judge: judge@ata2.demo  /  hold-36`

If that email is used on Sign in **and** no user exists yet, **auto-provision** that user once (hash of `hold-36`) so the printed credentials work without Sign up. Do this in `signIn()`, not as a special UI.

### 2.4 Validation (shared `lib/auth.ts`)

| Field | Rule | Error copy (English, exact) |
|---|---|---|
| Email | trim, lowercase store, RFC-simple: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `Enter a valid email.` |
| Password (sign in) | length ≥ 1 to enable button; on submit ≥ 8 | `Password must be at least 8 characters.` |
| Password (sign up) | ≥ 8, at least one letter and one number | `Use 8+ characters with a letter and a number.` |
| Name | 2–40 chars after trim, letters/spaces/hyphen/apostrophe | `Enter your name.` |
| Mismatch | sign-up confirm | `Passwords don’t match.` |
| Unknown email / bad password (sign in) | same message (no email enumeration) | `Email or password doesn’t match.` |
| Duplicate email (sign up) | | `An account with this email already exists.` |
| Network / storage throw | | `Couldn’t save the session. Try again.` |

Show field errors **on blur** and **on submit**. Clear a field’s error as the user edits it.

---

## 3. PAGE — Welcome · `app/(auth)/index.tsx`

This is the **brand page**. If this looks like a generic “Welcome to App”, you failed the theme.

### 3.1 Job

Tell the judge what ATA² is in one breath, then send them to Sign in or Sign up. Do not put a form here.

### 3.2 Layout (top → bottom), iPhone 16 safe area

**Background:** `#07090C` full bleed. Status bar light. No header.

**Top block** (paddingTop 12 beyond safe area, paddingHorizontal 24)

1. **Eyebrow** (11/600/`muted`, tracking +0.8, uppercase):  
   `PHOENIX  ·  2 M AIR + CANOPY`
2. **Wordmark** (28/600/`text`):  
   `ATA²`  
   Kern so the ² sits as a superscript-like using unicode `²` (U+00B2), not a second Text with fontSize 16 unless the system ² looks wrong — then `ATA` + `²` in one row, ² at 18/600/`hold`.
3. **Product name** (15/400/`muted`, marginTop 6):  
   `Thermal Hold`
4. **Chip row** (marginTop 16), two chips, not buttons:
   - Chip A: border `heat`, text `heat`, 11/600: `TCM REFUSED`
   - Chip B: border `hold`, text `hold`, 11/600: `HOLD APPROVED`
   - Height 28, paddingHorizontal 10, radius 8, gap 8, row
   - These are **decorative**. `pointerEvents="none"`. They teach the palette before Map exists.

**Middle block** (marginTop 36, paddingHorizontal 24)

5. **Title** (28/600/`text`, max two lines):  
   `Don’t wait in the sun.`
6. **Deck** (15/400/`muted`, marginTop 12, max 4 lines):  
   `Downtown Phoenix 2 m air is lethal and spatially flat. ATA² refuses that map, then splits dwell into indoor holds so one shade strip is not the new trap.`
7. **One-liner** (15/400/`text`, marginTop 20, not muted — this is the thesis):  
   `ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun.`

**Bottom block** (pinned to bottom with `justifyContent: 'space-between'` **or** a spacer + this stack; paddingHorizontal 24; paddingBottom 16 + home indicator)

8. **Primary** `AuthButton`: label `Sign in` → push `/(auth)/sign-in`
9. **Secondary** `AuthButton` outline variant (only used here):
   - Height 52, radius 12, fill transparent, border 1 `border`, label `hold` 17/600
   - Label `Create account` → push `/(auth)/sign-up`
   - marginTop 12
10. **Judge hatch** (marginTop 16, centered, 13/400/`muted`):  
    `Hackathon judge — skip gate`  
    - Entire line is pressable, hitSlop 12
    - On press: `signInJudge()` then Protected routes send them to tabs
    - Haptic `ImpactLight`
    - **Do not** style this as a third primary button
11. **Legal micro** (marginTop 12, 11/400/`muted`, centered, max 2 lines):  
    `Local demo accounts only. FortyGuard keys never leave the Mac backend.`

### 3.3 States

| State | UI |
|---|---|
| Default | as above |
| Judge skip loading | disable both buttons + hatch; primary shows spinner if you reuse AuthButton — **prefer** a full-screen 20% black overlay with centered spinner `cool`, 1s max |
| Judge skip error | banner under title: `Couldn’t start the demo session.` + retry on the hatch |

### 3.4 What this page must not have

- Email fields
- Social buttons
- Carousel / pager
- Map screenshot
- Fake temperature 39.7 as a hero number (that belongs on Hold after login)
- “Get started” generic CTA as the only button

### 3.5 Accessibility

- Wordmark `accessibilityLabel="ATA squared, Thermal Hold"`
- Chips hidden from a11y (`accessible={false}`) because they are visual-only
- Skip hatch `accessibilityRole="button"` `accessibilityHint="Enters the app without an account"`

---

## 4. PAGE — Sign in · `app/(auth)/sign-in.tsx`

### 4.1 Job

Authenticate an existing local user. Quiet form. Primary = hold teal.

### 4.2 Navigation chrome

- Native stack **header shown**
- Title empty string (we use in-screen title)
- Back chevron to Welcome, tint `cool`
- Header transparent / `bg` `#07090C`, no shadow, `headerTintColor` `#4CC9F0`
- Right header: none

### 4.3 Layout (ScrollView, paddingHorizontal 24)

**Top** (paddingTop 8)

1. Eyebrow: `OPERATOR ACCESS`
2. Title: `Sign in`
3. Deck (marginTop 8): `Same Phoenix snapshot. No invented heat.`

**Form** (marginTop 28, gap 16 between fields)

4. **Email**
   - Label: `Email`
   - Placeholder: `name@agency.gov`
   - `keyboardType="email-address"`
   - `autoCapitalize="none"` `autoCorrect={false}`
   - `textContentType="username"` `autoComplete="email"`
   - `returnKeyType="next"` → focus password
5. **Password**
   - Label: `Password`
   - Placeholder: `••••••••`
   - `textContentType="password"` `autoComplete="password"`
   - `returnKeyType="go"` → submit
   - Trailing eye toggle

**Row under password** (marginTop 8, space-between, height 44)

6. Left: empty (or keep spacer)
7. Right text button: `Forgot password?` → push `/(auth)/forgot-password`

**Submit** (marginTop 24)

8. Primary: `Sign in`
   - Enable when email contains `@` **and** password length ≥ 1
   - On press: validate; if invalid, haptic error, do not navigate
   - On unknown user / bad hash: form-level error **below the button** (13/`heat`): `Email or password doesn’t match.`
   - On success: haptic success, session set, Protected stack shows tabs (do not `router.replace` unless you must; prefer session update)

**Footer** (marginTop 28, centered)

9. `No account?` (`muted` 15) + `Create one` (`cool` 15/600) → Sign up  
   Use a single line `Text` with nested `Text` pressable, or a row.

**Micro** (marginTop 20, 11/`muted`)

10. `Judge: judge@ata2.demo  /  hold-36`

**Keyboard**

- `keyboardShouldPersistTaps="handled"`
- Avoid covering the primary button; if needed, extra `contentContainerStyle` paddingBottom 48

### 4.4 Field-level errors (exact)

- Invalid email on blur/submit: `Enter a valid email.`
- Password empty on submit: `Enter your password.`
- Password 1–7 chars on submit: `Password must be at least 8 characters.`
- Do not show “user not found” vs “wrong password” as different strings.

### 4.5 Loading

- Disable email, password, forgot, submit
- Submit shows spinner, label hidden
- Back still works (cancel)

### 4.6 What this page must not have

- Name field
- “Continue with Apple”
- Remember-me checkbox (SecureStore session is enough)
- Heat-colored primary button

---

## 5. PAGE — Sign up · `app/(auth)/sign-up.tsx`

### 5.1 Job

Create a local operator account. Same theme as Sign in — **do not** invent a friendlier / more colorful Sign up.

### 5.2 Navigation chrome

Same as Sign in: back to previous (Welcome or Sign in), tint `cool`, bg `#07090C`.

### 5.3 Layout

**Top**

1. Eyebrow: `NEW OPERATOR`
2. Title: `Create account`
3. Deck: `Local to this iPhone. The FortyGuard key stays on the Mac.`

**Form** (marginTop 28, gap 16)

4. **Name**
   - Label: `Name`
   - Placeholder: `Alex Rivera`
   - `autoCapitalize="words"` `textContentType="name"` `autoComplete="name"`
   - `returnKeyType="next"`
5. **Email** — same as Sign in
6. **Password**
   - Label: `Password`
   - Helper **under field when focused or non-empty, not an error**: `8+ characters, letter and number.` color `muted`
   - If the helper rule fails **after blur or submit**, replace helper with error `Use 8+ characters with a letter and a number.` in `heat`
7. **Confirm password**
   - Label: `Confirm password`
   - `textContentType="newPassword"`
   - `returnKeyType="go"` → submit

**Legal** (marginTop 16, 11/`muted`, 3 lines max)

8. `By creating an account you agree this is a hackathon demo. No live city actuation.`

**Submit** (marginTop 20)

9. Primary: `Create account`
   - Enable when name ≥ 2, email has `@`, password ≥ 8, confirm ≥ 8
   - Duplicate email: form error below button `An account with this email already exists.` + a `Sign in` cool link
   - Success: haptic success, session set → tabs

**Footer**

10. `Already have an account?` + `Sign in`

### 5.4 Confirm-password UX

- Do not error while the user is still typing confirm if it is a prefix of password
- On blur of confirm, or submit: if mismatch → `Passwords don’t match.`

### 5.5 What this page must not have

- Role picker (operator vs citizen)
- City picker (Phoenix is locked)
- Terms URL (no website)
- Newsletter checkbox

---

## 6. PAGE — Forgot password · `app/(auth)/forgot-password.tsx`

### 6.1 Job

Collect an email and **pretend** a reset was sent. There is no mail server. Honesty in microcopy is part of the theme (ops tool, not growth-hack).

### 6.2 Navigation

Back to Sign in. Title empty. Tint `cool`.

### 6.3 Layout

1. Eyebrow: `RESET`
2. Title: `Forgot password`
3. Deck: `We’ll show a confirmation screen. This demo does not send email.`
4. Email field (prefill from Sign in if you passed `?email=` via `useLocalSearchParams`; Sign in **must** pass the current email when navigating: `router.push({ pathname: '/(auth)/forgot-password', params: { email } })`)
5. Primary: `Send reset link`
   - Enable when email valid
   - On submit: **always** go to Check email after 400–700ms fake delay (even if the email is unknown — no enumeration)
   - Pass `email` param to Check email
6. Text button: `Back to sign in`

### 6.4 What this page must not have

- New password fields (that is a different product)
- “Check your spam” as the only body (that belongs on the next page)
- Claiming “we sent a link” **before** navigation

---

## 7. PAGE — Check email · `app/(auth)/check-email.tsx`

### 7.1 Job

Close the forgot-password loop without lying that an SMTP server exists.

### 7.2 Navigation

- **No back to Forgot** (prevent double-submit confusion). `headerBackVisible: false`
- Left: none. User leaves via the primary button only.

### 7.3 Layout (centered column, padding 24)

1. A 56×56 rounded square, fill `surface`, border `border`, centered SF Symbol `envelope` tint `hold` (size 28). **Not** a cartoon mailbox.
2. Title (marginTop 24, textAlign center): `Check this device`
3. Deck (marginTop 12, textAlign center):  
   `No message was sent. For this hackathon build, return to sign in and use your password, or the judge credentials on that screen.`
4. If `email` param present, one line (marginTop 16, 13/`cool`, textAlign center):  
   `{email}`  
   Do not invent a masked email if param missing — omit the line.
5. Primary (marginTop 32): `Back to sign in` → `router.replace('/(auth)/sign-in')`
6. Secondary text: `Create account` → replace Sign up

### 7.4 What this page must not have

- “Open Mail app” (there is no mail)
- Green check confetti
- Auto-redirect timer

---

## 8. Copy deck (use verbatim)

| Location | Copy |
|---|---|
| Welcome title | Don’t wait in the sun. |
| Welcome deck | Downtown Phoenix 2 m air is lethal and spatially flat. ATA² refuses that map, then splits dwell into indoor holds so one shade strip is not the new trap. |
| One-liner | ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun. |
| Welcome primary | Sign in |
| Welcome outline | Create account |
| Judge | Hackathon judge — skip gate |
| Sign in title | Sign in |
| Sign in deck | Same Phoenix snapshot. No invented heat. |
| Sign up title | Create account |
| Sign up deck | Local to this iPhone. The FortyGuard key stays on the Mac. |
| Forgot title | Forgot password |
| Forgot deck | We’ll show a confirmation screen. This demo does not send email. |
| Check title | Check this device |
| Check deck | No message was sent. For this hackathon build, return to sign in and use your password, or the judge credentials on that screen. |

If you rewrite any of these, you are off-brief.

---

## 9. Implementation notes

- Expo SDK **57** docs: https://docs.expo.dev/versions/v57.0.0/
- Packages: `expo-secure-store`, `expo-crypto`, `expo-haptics`, `expo-symbols` (already in the app). Do not add NativeWind / Tamagui / Paper.
- iPhone 16 safe areas. Dynamic Island: Welcome top padding from `useSafeAreaInsets().top`, not a hardcoded 59.
- `userInterfaceStyle: dark` stays.
- Do not import `react-native-maps` from auth files.
- Do not call ATA² `/v1/*` from auth screens (auth is local).
- Existing `context/Session.tsx` is **trip state** and currently imports synthetic `lib/phoenix.ts`. Do not expand that. Auth is separate. If imports break because Session still runs A* at boot, wrap trip Session so it only mounts **inside `(tabs)`**, not at the root — root should be Auth-only + Stack. This is required: today `_layout.tsx` wraps the whole app in trip `SessionProvider`, which will fight Protected routes and keep the gauss field alive. **Move trip SessionProvider into `app/(tabs)/_layout.tsx`.**

### Sign out (only extra UI)

On `app/(tabs)/now.tsx` (Hold), top-right, 13/`muted`: `Sign out`. Calls `useAuth().signOut()`. No confirm dialog. Haptic light.

---

## 10. Build order (do not skip)

1. Tokens + `AuthField` / `AuthButton` / `AuthScreen` in isolation (Welcome static first).
2. `Auth` context + SecureStore + `Stack.Protected`.
3. Welcome interactions (Sign in / Sign up / judge skip).
4. Sign in + Sign up validation + persistence.
5. Forgot + Check email.
6. Sign out on Hold.
7. Kill switch: restart Expo Go, confirm session survives; Sign out, confirm Welcome.

---

## 11. Visual QA checklist (iPhone 16)

- [ ] Welcome chips are heat + hold, not both cyan
- [ ] Primary buttons are teal `#2EC4B6`, never orange
- [ ] Errors are orange `#FF6B35`, never teal
- [ ] No emoji, no Inter, no rainbow gradient
- [ ] Keyboard open on Sign in: Sign in button still reachable
- [ ] Judge skip lands on tabs without a form
- [ ] `judge@ata2.demo` / `hold-36` signs in
- [ ] Duplicate Sign up shows the exact duplicate sentence
- [ ] Forgot never reveals whether the email exists
- [ ] Check email does **not** claim a real email was sent

When in doubt: **the street is not the product. Dwell is.** Auth is just the gate — it should feel like the same tool.
