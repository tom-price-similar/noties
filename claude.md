# Noties - Multi-Platform Notes Application

## Project Overview

**Noties** is a cross-platform notes application with real-time synchronization and offline capabilities. It runs as a web app, PWA (Progressive Web App), and native desktop application.

**Live PWA**: https://tom-price-similar.github.io/noties/
**GitHub Repository**: https://github.com/tom-price-similar/noties

## Key Features

- **Multi-platform**: Web, PWA (iOS/Android), and Electron desktop app (macOS)
- **Real-time sync**: Notes synchronize across all devices via Firebase Firestore
- **Offline-first**: Full functionality offline with IndexedDB local storage
- **Single contenteditable editor**: Native text selection and editing with slash commands
- **Auto-save**: Debounced saving (500ms) prevents data loss
- **Dark theme**: Minimalist dark UI optimized for readability
- **Smart checklists**: Checked items automatically move to the bottom of their checklist

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
│   ├── main.js                 # Electron main process
│   └── preload.js              # Preload script for Electron API exposure
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── pwa-*.png              # PWA icons
├── src/
│   ├── components/
│   │   ├── NotesList.vue      # Notes list (PWA only)
│   │   ├── NoteEditor.vue     # Single contenteditable WYSIWYG editor
│   │   ├── SlashMenu.vue      # Slash command menu for inserting elements
│   │   ├── Sidebar.vue        # Desktop sidebar with note list
│   │   ├── DesktopLayout.vue  # Desktop two-panel layout
│   │   ├── TabBar.vue         # Bottom tab navigation (PWA only)
│   │   └── DayPlanner.vue     # Day planner component
│   ├── stores/
│   │   └── plannerStore.js    # Day planner state management
│   ├── App.vue                # Root component with platform detection
│   ├── main.js                # Vue app entry point
│   ├── firebase.js            # Firebase configuration
│   ├── notesStore.js          # Central state management with migration
│   ├── offlineSync.js         # Offline synchronization logic
│   └── style.css              # Global styles
├── dist/                      # PWA build output
├── dist-electron/             # Electron build output
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite & PWA configuration
└── index.html                 # HTML entry point
```

## Core Components

### Note Editor
- **NoteEditor.vue**: Single contenteditable div for all note content
- Native text selection across headings, paragraphs, and checklists
- Slash commands (`/`) trigger a menu to insert headings and checklists
- Checked items automatically sort to the bottom of their checklist group

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
  └── default/                    # All data stored under 'default' collection (no PIN)
      ├── notes/
      │   └── {noteId}
      │       ├── title
      │       ├── content         # HTML content from contenteditable
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

1. **Firestore Rules**: Must be configured for production
2. **Electron**: Context isolation enabled, no Node integration
3. **API Keys**: Client-side Firebase config (secure with Firestore rules)

## Known Limitations

- No user authentication (all data stored in single 'default' collection)
- No collaborative editing support
- Day planner data resets daily (no history)
- No export functionality for notes or checklists

## Future Enhancement Ideas

- User authentication with email/OAuth
- Note sharing and collaboration
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

### Electron Build Issues
- Run `npm ci` for clean dependency install
- Check Node.js version compatibility (v18+)
- Verify code signing settings for macOS

## Recent Updates

### 2025-11-28 - Single Contenteditable Editor & Simplified Architecture
- **Editor Rewrite to Single Contenteditable**:
  - Replaced complex block-based system with single contenteditable div
  - Native text selection works across all content (headings, paragraphs, checklists)
  - Simpler, more intuitive editing experience like a standard text editor
  - Slash commands (`/`) insert headings (H1/H2/H3) and colored checklists

- **Smart Checklist Sorting**:
  - Checked items automatically move to the bottom of their checklist group
  - Unchecked items move back above checked items when toggled
  - Each checklist group is treated independently

- **Removed PIN Authentication**:
  - All data now stored under 'default' collection (no PIN required)
  - Simplified routing - no PinScreen component
  - plannerStore updated to use DEFAULT_COLLECTION

- **Bug Fixes**:
  - Fixed planner data not persisting (was using old PIN-based collection path)
  - Fixed note switching bugs (initializedBlocks Set not clearing)

- **Desktop Electron Improvements**:
  - 150px sidebar with note titles (auto-selects latest note)
  - Fixed window draggable region and traffic light overlap
  - Two-panel layout for desktop (sidebar + editor)

### 2024-11-28 - Major Feature Release
- **Initial deployment to GitHub Pages**
  - Configured GitHub Actions for automatic deployment
  - Set up PWA hosting at https://tom-price-similar.github.io/noties/

- **New Features Implemented**:
  - Tab Navigation: Bottom tab bar for Notes and Day Planner sections
  - Day Planner: Daily planning with 30-minute time slots (6AM-10PM)
  - Checklists: Todo lists within notes with checkbox items
  - Markdown Support: H1-H3, bold, italic, strikethrough
  - Clickable Links: Auto-detect URLs and markdown link syntax
  - Offline Sync: All features work offline with queue-based synchronization

- **Technical Improvements**:
  - Added `marked` and `dompurify` for secure markdown rendering
  - Created modular components: TabBar, DayPlanner
  - Implemented plannerStore for day planner state management
  - Enhanced routing with tab-based navigation

## Support & Documentation

- **Repository**: https://github.com/tom-price-similar/noties
- **Live App**: https://tom-price-similar.github.io/noties/
- **Issues**: Report bugs via GitHub Issues

---

*This documentation helps Claude understand the project structure, implementation details, and deployment configuration for future development sessions.*