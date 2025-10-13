# PayPal Donation Button Setup

I've created a reusable PayPal donation component for you. Here's how to set it up:

## What You Need

**Only your PayPal email address!** That's it. PayPal will handle the rest.

## Step 1: Update Your PayPal Email

Edit this file:
```
src/components/donation/paypal-donate-button.tsx
```

Find these two lines and replace `'YOUR_PAYPAL_EMAIL@example.com'` with your actual PayPal email:
- Line 15: `email = 'YOUR_PAYPAL_EMAIL@example.com'`
- Line 68: `email = 'YOUR_PAYPAL_EMAIL@example.com'`

Example:
```typescript
email = '420monkeybusiness@gmail.com'  // Replace with your actual PayPal email
```

## Step 2: Add to Your Pages

### Option A: Card Style (Recommended for prominent placement)

```typescript
import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'

// In your component:
<PayPalDonateButton variant="card" className="max-w-md" />
```

This displays a nice card with:
- Heart icon
- "Support Free AI Access" title
- Description of how donations help
- PayPal donation button

### Option B: Button Style (For headers/footers)

```typescript
import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'

// In your component:
<PayPalDonateButton variant="button" />
```

This displays a simple "Donate" button with a heart icon.

### Option C: Preset Amount Buttons

```typescript
import { PayPalDonateForm } from '@/components/donation/paypal-donate-button'

// In your component:
<PayPalDonateForm presetAmounts={[5, 10, 25, 50, 100]} />
```

This shows buttons for $5, $10, $25, $50, $100 donations.

## Where to Add It

### Landing Page
Edit `src/components/landing-page-client.tsx` and add the donation card near the bottom of the page, before the footer.

### Dashboard
Edit `src/app/dashboard/page.tsx` and add a donation card in the sidebar or at the top of the dashboard.

### App Header
Edit your header component and add a small donation button in the top-right corner.

## Example Placements

### Landing Page (Bottom of page)
```typescript
'use client'

import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'

export function LandingPageClient() {
  return (
    <div>
      {/* ... existing content ... */}

      {/* Add before footer */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <PayPalDonateButton variant="card" />
        </div>
      </section>

      {/* Footer */}
    </div>
  )
}
```

### Dashboard (Sidebar or top banner)
```typescript
import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'

export default function DashboardPage() {
  return (
    <div>
      {/* Top banner */}
      <div className="mb-6">
        <PayPalDonateButton variant="card" />
      </div>

      {/* Rest of dashboard */}
    </div>
  )
}
```

### Header (Small button)
```typescript
import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'

export function Header() {
  return (
    <header>
      {/* ... other header items ... */}
      <PayPalDonateButton variant="button" className="ml-4" />
    </header>
  )
}
```

## How It Works

1. User clicks the donation button
2. Opens PayPal in a new tab
3. User can donate any amount (or select from presets if using PayPalDonateForm)
4. PayPal processes the payment
5. Money goes directly to your PayPal account

## Customization

You can customize:
- **Item name**: What the donation is for (default: "Support GovMatch AI - Free AI Models")
- **Currency**: USD, EUR, GBP, etc. (default: USD)
- **Preset amounts**: For the form variant (default: $5, $10, $25, $50, $100)
- **Styling**: All components accept className prop for custom styling

Example:
```typescript
<PayPalDonateButton
  variant="card"
  email="your@email.com"
  itemName="Help Keep AI Free for Everyone"
  currency="USD"
  className="shadow-lg"
/>
```

## Next Steps

1. Replace the email addresses in the component
2. Choose where you want to place the donation button(s)
3. Commit and deploy!

That's it! Your donation button will be live and ready to accept contributions.
