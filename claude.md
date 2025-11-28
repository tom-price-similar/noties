# Noties - Multi-Platform Notes Application

## Project Overview

**Noties** is a cross-platform notes application with real-time synchronization and offline capabilities. It runs as a web app, PWA (Progressive Web App), and native desktop application.

**Live PWA**: https://tom-price-similar.github.io/noties/
**GitHub Repository**: https://github.com/tom-price-similar/noties

## Key Features

- **Multi-platform**: Web, PWA (iOS/Android), and Electron desktop app (macOS)
- **Real-time sync**: Notes synchronize across all devices via Firebase Firestore
- **Offline-first**: Full functionality offline with IndexedDB local storage
- **PIN authentication**: Simple 4-digit PIN for user access (stored in sessionStorage)
- **Auto-save**: Debounced saving (500ms) prevents data loss
- **Dark theme**: Minimalist dark UI optimized for readability

## Technology Stack

### Frontend
- **Vue 3.4.3** - Reactive UI framework
- **Vue Router 4.2.5** - Client-side routing
- **Vite 5.0.10** - Build tool and dev server

### Backend & Data
- **Firebase 10.7.1** - Cloud Firestore database for note storage
- **idb 8.0.0** - IndexedDB wrapper for offline storage

### Platform Support
- **Electron 28.1.0** - Desktop application framework
- **vite-plugin-pwa 0.17.4** - Progressive Web App with Workbox service workers
- **electron-builder 24.9.1** - Desktop app packaging

## Project Structure

```
/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions for automatic deployment
├── electron/
│   └── main.js                 # Electron main process
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── pwa-*.png              # PWA icons
├── src/
│   ├── components/
│   │   ├── PinScreen.vue      # PIN authentication
│   │   ├── NotesList.vue      # Notes list with sync status
│   │   └── NoteEditor.vue     # Note editing interface
│   ├── App.vue                # Root component
│   ├── main.js                # Vue app entry point
│   ├── firebase.js            # Firebase configuration
│   ├── notesStore.js          # Central state management
│   ├── offlineSync.js         # Offline synchronization logic
│   └── style.css              # Global styles
├── dist/                      # PWA build output
├── dist-electron/             # Electron build output
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite & PWA configuration
└── index.html                 # HTML entry point
```

## Core Components

### Authentication Flow
- **PinScreen.vue**: 4-digit PIN entry with visual feedback
- PIN stored in sessionStorage (session-only persistence)
- Automatic routing based on auth state

### Data Management
- **notesStore.js**: Vue composable for note CRUD operations
- Real-time Firestore subscriptions with `onSnapshot()`
- Reactive state management with Vue refs

### Offline Synchronization
- **offlineSync.js**: IndexedDB queue for offline changes
- Network status monitoring with automatic sync
- "Last write wins" conflict resolution

## Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev                 # Start web dev server (http://localhost:5173)
npm run electron:dev        # Start Electron app with hot reload

# Production Build
npm run build              # Build PWA for web deployment
npm run electron:build     # Build macOS desktop app (DMG)

# Preview & Testing
npm run preview            # Preview production build locally
```

## Deployment

### GitHub Pages (PWA)
- **URL**: https://tom-price-similar.github.io/noties/
- **Auto-deploy**: Pushes to main branch trigger GitHub Actions
- **Config**: Base path set to `/noties/` in vite.config.js

### Desktop Distribution
- **macOS**: DMG installer in `dist-electron/`
- **App ID**: `com.noties.app`
- **Architecture**: ARM64 (Apple Silicon)

## Firebase Configuration

The app uses Firebase Firestore with the following structure:
```
pins/
  └── {pin}/
      ├── notes/
      │   └── {noteId}
      │       ├── title
      │       ├── content
      │       ├── checklist: [
      │       │   { id, text, checked, priority, createdAt }
      │       │ ]
      │       ├── createdAt
      │       └── updatedAt
      └── dayplans/
          └── {YYYY-MM-DD}
              ├── slots: {
              │   '06:00': string,
              │   '06:30': string,
              │   // ... through to
              │   '21:30': string
              │ }
              └── updatedAt
```

**Note**: Firebase API keys are exposed in client code (standard for Firebase web apps). Ensure proper Firestore security rules are configured.

## Key Implementation Details

### Auto-save Mechanism
- 500ms debounce on note edits
- Prevents excessive Firestore writes
- Visual feedback with save indicator

### Sync Status Indicators
- 🟢 Green: Synced successfully
- 🟡 Yellow: Syncing in progress
- 🔴 Red: Offline mode active

### PWA Features
- Service worker for offline caching
- Installable on mobile devices
- Standalone display mode
- Dark theme with safe area support

## Security Considerations

1. **PIN Storage**: Session-only (cleared on browser close)
2. **Firestore Rules**: Must be configured for production
3. **Electron**: Context isolation enabled, no Node integration
4. **API Keys**: Client-side Firebase config (secure with Firestore rules)

## Known Limitations

- PIN system is basic (4 digits, no encryption)
- No user account management
- Single PIN = single note collection
- No collaborative editing support
- Day planner data resets daily (no history)
- Cannot mix text and checklist in same note (either/or mode)
- No export functionality for notes or checklists

## Future Enhancement Ideas

- User authentication with email/OAuth
- Note sharing and collaboration
- Mixed content notes (text + checklist in same note)
- Note categories/tags
- Search functionality across all notes
- Export options (PDF, Markdown, JSON)
- Day planner history and analytics
- Recurring tasks in day planner
- End-to-end encryption
- Multi-language support
- Dark/Light theme toggle
- Note templates
- File attachments and images

## Troubleshooting

### PWA Installation Issues
- Ensure HTTPS connection (GitHub Pages provides this)
- Clear browser cache if updates don't appear
- Check manifest.json is served correctly

### Sync Issues
- Verify internet connection
- Check browser console for Firestore errors
- Ensure PIN matches across devices

### Electron Build Issues
- Run `npm ci` for clean dependency install
- Check Node.js version compatibility (v18+)
- Verify code signing settings for macOS

## Recent Updates

### 2024-11-28 - Major Feature Release
- **Initial deployment to GitHub Pages**
  - Configured GitHub Actions for automatic deployment
  - Set up PWA hosting at https://tom-price-similar.github.io/noties/

- **New Features Implemented**:
  - ✅ **Tab Navigation**: Bottom tab bar for Notes and Day Planner sections
  - ✅ **Day Planner**: Daily planning with 30-minute time slots (6AM-10PM)
  - ✅ **Checklists**: Todo lists within notes with checkbox items
  - ✅ **Priority System**: Color-coded priorities (High/Medium/Low) for checklist items
  - ✅ **Markdown Support**: H1-H3, bold, italic, strikethrough with live preview
  - ✅ **Clickable Links**: Auto-detect URLs and markdown link syntax
  - ✅ **Offline Sync**: All features work offline with queue-based synchronization

- **Technical Improvements**:
  - Added `marked` and `dompurify` for secure markdown rendering
  - Created modular components: TabBar, DayPlanner, ChecklistItem, PriorityPicker
  - Implemented plannerStore for day planner state management
  - Enhanced routing with tab-based navigation

## Support & Documentation

- **Repository**: https://github.com/tom-price-similar/noties
- **Live App**: https://tom-price-similar.github.io/noties/
- **Issues**: Report bugs via GitHub Issues

---

*This documentation helps Claude understand the project structure, implementation details, and deployment configuration for future development sessions.*