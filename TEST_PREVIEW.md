# File Preview Debugging Guide

## Steps to Debug File Preview Issue

### 1. Open Browser Console
- Press `F12` or right-click > Inspect
- Click on the "Console" tab

### 2. Clear Console
- Click the 🚫 icon or press Ctrl+L to clear old messages

### 3. Try Preview
- Click "Quick Preview" on any document

### 4. Look for These Messages

Look for these exact messages in the console:

```
FileViewerModal - Document type: {...}
FilePreview - Starting fetchFileContent for: {...}
FilePreview - Fetch URL decision: {...}
FilePreview - Getting blob from response...
❌ FilePreview - Preview not available: {...}
```

### 5. What to Share

Please share:
1. Any RED error messages
2. The complete "❌ FilePreview - Preview not available" object
3. Screenshot of the Console tab showing all messages

### 6. If Yellow Debug Box Appears

If you see a yellow debug box in the preview modal, please share:
- ID
- FilePath
- MimeType
- Error

## Common Issues

1. **FilePath is "none"** - Document wasn't uploaded properly
2. **Error contains "404"** - File not found in storage
3. **Error contains "Failed to fetch"** - Network or Supabase issue
4. **No console logs at all** - JavaScript error preventing component from rendering
