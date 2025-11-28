# Noties - Technical Implementation Prompt for Claude Code

## Project Overview

Noties is a Vue 3 PWA notes app with Electron wrapper for Mac. It uses Firebase Firestore for real-time sync and offline support. The app uses PIN-based authentication where notes are stored under `pins/{pin}/notes` in Firestore.

**Tech Stack:** Vue 3 (Composition API), Vite, Firebase Firestore, IndexedDB (via idb), Electron, Vite-PWA

**Design:** Dark mode only, Apple Notes-inspired, minimal UI, accent colour #ffc857 (yellow)

---

## Features to Implement

### 1. Checklists Within Notes

**Requirements:**
- Users can create checklist items within any note
- Checklist items have: checkbox (checked/unchecked), text content
- Checked items automatically move to bottom of the checklist
- Unchecked items maintain their creation order above checked items
- Keyboard: Enter creates new checklist item, Backspace on empty item deletes it

**Data Structure (extend note object):**
```javascript
{
  id: string,
  title: string,
  content: string, // plain text content
  checklist: [
    { id: string, text: string, checked: boolean, priority: 'none' | 'high' | 'medium' | 'low', createdAt: timestamp }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**UI:**
- Add toggle in note editor to switch between text mode and checklist mode, or allow both in same note
- Checkbox on left, text input on right
- Checked items: strikethrough text, muted colour, grouped at bottom
- Smooth animation when items move to bottom on check

---

### 2. Priority Checklists (Coloured Checkboxes)

**Requirements:**
- Three priority levels: high (red #ff6b6b), medium (yellow #ffc857), low (green #4ade80)
- Default priority is 'none' (standard checkbox, grey/white)
- User can tap/click checkbox area to cycle through: none → high → medium → low → none
- Or long-press/right-click for priority picker popup

**UI:**
- Checkbox border and fill colour matches priority
- High priority items could optionally sort above medium, medium above low (user preference)
- Priority indicator should be clear but not overwhelming

---

### 3. Text Styling

**Requirements:**
- Support for: Headers (H1, H2, H3), Bold, Italic, Strikethrough
- Markdown-style shortcuts in editor:
  - `# ` at line start → H1
  - `## ` → H2
  - `### ` → H3
  - `**text**` → bold
  - `*text*` → italic
  - `~~text~~` → strikethrough
- Store content as markdown, render as formatted text
- Simple toolbar with formatting buttons (optional, can be hidden)

**Implementation approach:**
- Use a lightweight markdown parser (marked, markdown-it, or simple regex)
- Render preview below input, or inline formatting in contenteditable
- Keep it simple - no need for full WYSIWYG, markdown input with live preview is fine

---

### 4. Links

**Requirements:**
- Auto-detect URLs in note content and make them clickable
- Markdown link syntax support: `[text](url)`
- Tapping link opens in external browser (not in-app)
- Visual distinction for links (accent colour, underline)

**Implementation:**
- Regex to detect URLs: `https?://[^\s]+`
- Parse markdown links during render
- In Electron: use `shell.openExternal(url)`
- In PWA: standard `<a href target="_blank">`

---

### 5. Day Planner

**Requirements:**
- Separate tab/view accessible from main navigation
- Shows today and tomorrow (toggle between them)
- Time slots: 6:00 AM to 10:00 PM in 30-minute increments (32 slots)
- Each slot: time label on left, text input on right
- Resets daily (previous days' data is discarded)
- Syncs across devices like notes

**Data Structure (new Firestore collection):**
```javascript
// Collection: pins/{pin}/dayplans
{
  id: string, // format: 'YYYY-MM-DD'
  slots: {
    '06:00': string,
    '06:30': string,
    '07:00': string,
    // ... through to
    '21:30': string
  },
  updatedAt: timestamp
}
```

**UI:**
- Tab bar at bottom: "Notes" | "Day Planner"
- Header shows date with left/right arrows or "Today" / "Tomorrow" toggle
- Scrollable list of time slots
- Current time slot highlighted (subtle accent border or background)
- Empty slots show placeholder text
- Auto-save on input (debounced like notes)

**Navigation update:**
- Add bottom tab bar component
- Routes: `/notes`, `/note/:id`, `/planner`
- Tab bar visible on NotesList and DayPlanner, hidden in NoteEditor

---

## Implementation Notes

**File structure for new components:**
```
src/
├── components/
│   ├── PinScreen.vue
│   ├── NotesList.vue
│   ├── NoteEditor.vue
│   ├── DayPlanner.vue       ← new
│   ├── TabBar.vue           ← new
│   ├── ChecklistItem.vue    ← new
│   └── PriorityPicker.vue   ← new
├── stores/
│   ├── notesStore.js        ← update
│   └── plannerStore.js      ← new
```

**Firestore rules to update:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pins/{pin}/notes/{noteId} {
      allow read, write: if true;
    }
    match /pins/{pin}/dayplans/{date} {
      allow read, write: if true;
    }
  }
}
```

**Styling consistency:**
- Use existing CSS variables from style.css
- Maintain dark theme throughout
- Keep animations subtle (0.2s transitions)
- Mobile-first, ensure touch targets are minimum 44px

**Testing priorities:**
1. Offline functionality - all features must work offline
2. Sync conflicts - last-write-wins for all new features
3. iPhone 13 mini responsive - test all views at 375px width
4. Electron - ensure all features work in desktop wrapper

---

## Suggested Implementation Order

1. **Tab Bar + Day Planner** - adds new navigation pattern without touching existing notes
2. **Checklists** - core functionality, builds foundation for priorities
3. **Priority colours** - extends checklists
4. **Text styling** - enhances notes content
5. **Links** - polish feature, can be added last

---

