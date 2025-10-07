# Dark Mode Implementation

## Overview

The landing page now includes a complete dark mode implementation using the existing `next-themes` system. Users can toggle between light mode, dark mode, system preference, and a custom GovMatch theme.

## Features

### Theme Toggle Button

- **Location**: Top-right corner of the landing page header (sticky navigation)
- **Options**:
  - ☀️ **Light Mode** - Clean, bright interface
  - 🌙 **Dark Mode** - Easy on the eyes for low-light environments
  - 💻 **System** - Automatically matches your OS preference
  - 🏢 **GovMatch Theme** - Custom dark theme

### How to Use

1. Visit the landing page at `/` (root)
2. Look for the sun/moon icon in the top-right navigation bar
3. Click the icon to open the theme menu
4. Select your preferred theme

## Technical Implementation

### Components Used

- **ThemeToggle Component**: `src/components/ui/theme-toggle.tsx`
- **ThemeProvider**: `src/components/providers/theme-provider.tsx` (wraps entire app)
- **Library**: `next-themes` for theme management

### Dark Mode Classes

All sections of the landing page use Tailwind CSS dark mode classes:

```tsx
// Example from hero section
className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950"

// Text colors
className="text-gray-600 dark:text-gray-300"

// Border colors
className="border dark:border-gray-800"

// Background colors
className="bg-white dark:bg-gray-950"
```

### Sections with Dark Mode

✅ **Header/Navigation** - Translucent with backdrop blur  
✅ **Hero Section** - Gradient backgrounds adapt to theme  
✅ **Features Grid** - Card backgrounds and borders  
✅ **How It Works** - Process cards with gradients  
✅ **Tech Stack** - Badge and card styling  
✅ **Monetization** - Code examples and pricing cards  
✅ **Open Source** - Information cards  
✅ **Stats** - Metric displays  
✅ **FAQ** - Question/answer cards  
✅ **CTA Section** - Call-to-action with gradients  
✅ **Footer** - Links and copyright  

## Customization

### Adding New Themes

To add a custom theme, edit `src/app/layout.tsx`:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="light"
  enableSystem
  themes={['light', 'dark', 'theme-govmatch', 'system', 'your-custom-theme']}
  disableTransitionOnChange
>
```

Then add the theme option to `src/components/ui/theme-toggle.tsx`:

```tsx
<DropdownMenuItem onClick={() => setTheme('your-custom-theme')} className="gap-2">
  <YourIcon className="h-4 w-4" />
  Your Custom Theme
  {mounted && theme === 'your-custom-theme' && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
</DropdownMenuItem>
```

### Custom Theme Styles

Define custom theme colors in `src/app/globals.css`:

```css
.theme-govmatch {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* Add more custom variables */
}
```

## Browser Support

Dark mode works in all modern browsers that support:
- CSS Custom Properties (CSS Variables)
- `prefers-color-scheme` media query
- LocalStorage (for persistence)

## Persistence

The selected theme is automatically saved to localStorage and persists across:
- Page reloads
- Browser sessions
- Different pages in the app

## Testing

Test dark mode on the landing page:

```bash
npm run dev
```

Then visit `http://localhost:3000` and toggle the theme using the button in the header.

## Accessibility

- **WCAG 2.1 AA Compliant**: Color contrast ratios meet accessibility standards
- **Keyboard Navigation**: Theme toggle is fully keyboard accessible
- **Screen Readers**: Theme options include proper ARIA labels
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Performance

- **Zero Flash**: Uses `suppressHydrationWarning` to prevent theme flash on load
- **CSS-only**: Theme switching uses CSS classes for instant changes
- **Optimized**: No JavaScript required after initial theme load

---

**Need help?** Check the [README.md](./README.md) for more information or open an issue on GitHub.
