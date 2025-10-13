# PayPal Donation Button Setup

## Step 1: Set Environment Variable

Add your PayPal email as an environment variable (NOT hardcoded):

### Local Development
Add to `.env.local`:
```bash
NEXT_PUBLIC_PAYPAL_EMAIL=your-paypal@email.com
```

### Vercel Deployment
```bash
vercel env add NEXT_PUBLIC_PAYPAL_EMAIL
# Enter your PayPal email when prompted
# Select: Production, Preview, Development (all three)
```

Or via Vercel Dashboard:
1. Go to Project Settings > Environment Variables
2. Add: `NEXT_PUBLIC_PAYPAL_EMAIL` = `your@email.com`
3. Select all environments
4. Redeploy

## Step 2: Use the Component

### Card Style (prominent placement):
```typescript
import { PayPalDonateButton } from '@/components/donation/paypal-donate-button'
<PayPalDonateButton variant="card" />
```

### Button Style (header/footer):
```typescript
<PayPalDonateButton variant="button" />
```

### Preset Amounts:
```typescript
import { PayPalDonateForm } from '@/components/donation/paypal-donate-button'
<PayPalDonateForm presetAmounts={[5, 10, 25, 50, 100]} />
```

## That's It!

The component automatically uses the environment variable. No hardcoded emails!
