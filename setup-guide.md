# Noties Setup Guide

## Project Structure

Create a folder called `noties` and set up this structure:

```
noties/
├── electron/
│   └── main.js
├── public/
│   ├── favicon.ico
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── apple-touch-icon.png
├── src/
│   ├── components/
│   │   ├── PinScreen.vue
│   │   ├── NotesList.vue
│   │   └── NoteEditor.vue
│   ├── App.vue
│   ├── main.js
│   ├── style.css
│   ├── firebase.js
│   ├── offlineSync.js
│   └── notesStore.js
├── index.html
├── package.json
└── vite.config.js
```

## Step-by-Step Setup

### 1. Create the project folder
```bash
mkdir noties
cd noties
mkdir -p electron public src/components
```

### 2. Create all the files
Copy each artifact I provided into its corresponding file location.

### 3. Create placeholder icons
For now, create simple placeholder icons (you can replace these later):
- `public/favicon.ico` - any small icon
- `public/pwa-192x192.png` - 192x192 PNG
- `public/pwa-512x512.png` - 512x512 PNG  
- `public/apple-touch-icon.png` - 180x180 PNG

Or I can generate these for you if you'd like.

### 4. Install dependencies
```bash
npm install
```

### 5. Run in development mode
```bash
# Web version (for testing in browser)
npm run dev

# Electron version (desktop app)
npm run electron:dev
```

### 6. Build for production

**For Mac desktop app:**
```bash
npm run electron:build
```
This creates a `.dmg` file in `dist-electron/`

**For PWA (iPhone):**
```bash
npm run build
```
Then deploy the `dist/` folder to any web host (Netlify, Vercel, GitHub Pages, etc.)

## Using on iPhone

1. Deploy the built PWA to a web host
2. Open the URL in Safari on your iPhone
3. Tap the Share button → "Add to Home Screen"
4. The app will now work offline and sync when online

## How Sync Works

- Both devices use the same PIN
- Notes are stored in Firebase under that PIN
- Changes sync in real-time when online
- Works offline - syncs when connection returns
- "Last edit wins" for conflicts

## Testing

1. Run `npm run dev`
2. Open http://localhost:5173
3. Enter any 4-digit PIN (e.g., 1234)
4. Create a note
5. Open in another browser/device with same PIN
6. Notes should sync!
