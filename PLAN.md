# Development Server Implementation Plan

## Overview
Implement a development server for Bray that serves rendered HTML and static files, with live reload capability when source files change.

**Key Features:**
- Express-based HTTP server on port 8000 (configurable)
- Live reload via Server-Sent Events (SSE)
- File watching with automatic recompilation
- Static files served WITHOUT `/static/` prefix (e.g., `/css/main.css` not `/static/css/main.css`)
- Render targets preserve folder structure (e.g., `src/render/foo/bar.jsx` → `/foo/bar.html`)

## Requirements (from user input)
- Default port: 8000 with `-p` or `--port` option
- Live reload: Yes (auto-refresh browser on file changes)
- Error handling: Console only (no HTML error pages, generic 500 in browser)
- Logging: Minimal (only errors and file changes)

## URL Routing Examples

Understanding how URLs map to files:

**Render Targets (HTML):**
```
URL: /index.html          → File: src/render/index.jsx (or .jsx.md)
URL: /about.html          → File: src/render/about.jsx (or .jsx.md)
URL: /blog/post.html      → File: src/render/blog/post.jsx (or .jsx.md)
URL: /                    → File: src/render/index.jsx (special case)
```

**Static Files (NO /static/ prefix in URL!):**
```
URL: /css/main.css        → File: src/static/css/main.css
URL: /js/app.js           → File: src/static/js/app.js
URL: /images/logo.png     → File: src/static/images/logo.png
URL: /fonts/font.woff2    → File: src/static/fonts/font.woff2
URL: /favicon.ico         → File: src/static/favicon.ico
```

**Components (internal only, not served via HTTP):**
```
Files in src/components/ are never served directly.
They are compiled into the prelude and used by render targets.
Folder structure in components/ is for organization only (namespace is flattened).
```

**Build Output Structure (for comparison):**
```
src/render/index.jsx      → build/index.html
src/render/about.jsx      → build/about.html
src/static/css/main.css   → build/css/main.css (note: static/ is removed)
```

## Current State Analysis

### What Exists
- Command-line option `--develop` / `-d` already defined (index.js:23-24)
- File watching skeleton exists in `testMain2()` (index.js:434-446)
- Express already added as dependency (package.json:12)
- Core rendering logic in `processOnePath()` and `realMain()`

### What's Missing
- Actual Express server setup
- HTTP routes for serving content
- Live reload mechanism
- Integration between file watcher and server
- Port configuration option

## Implementation Steps

### 1. Add Port Configuration
**File:** `src/index.js`
- Add `--port` / `-p` option to `optionDefinitions` array (~line 19-43)
  - Type: Number
  - Default: 8000
  - Description: Port for development server

### 2. Create Server Module
**File:** `src/server.js` (new file)

Create a new module to handle the Express server:
- Import Express and necessary dependencies
- Export a `createServer(options)` function that:
  - Sets up Express app
  - Configures routes (see section 3)
  - Returns server instance and helper functions

### 3. Implement Server Routes
**File:** `src/server.js`

**IMPORTANT ROUTING STRUCTURE:**
- Static files do NOT have `/static/` prefix in URLs
- `src/static/css/main.css` is served at `/css/main.css` (NOT `/static/css/main.css`)
- Render targets respect their folder structure: `src/render/foo/bar.jsx` → `/foo/bar.html`
- Route priority: Live reload → Render targets → Static files

#### Route 1: Live Reload Endpoint (Highest Priority)
- Pattern: `GET /bray-live-reload` (Server-Sent Events endpoint)
- Logic:
  1. Set headers for SSE (`text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`)
  2. Keep connection open
  3. Send reload event when files change
  4. Add connection to array for broadcasting

#### Route 2: HTML Render Targets
- Pattern: `GET /*` (any path ending in `.html` or exact path match to render file)
- Logic:
  1. Extract requested path (e.g., `/xyz.html` or `/foo/bar.html`)
  2. Convert to potential render file paths:
     - `/xyz.html` → look for `src/render/xyz.jsx` or `src/render/xyz.jsx.md`
     - `/foo/bar.html` → look for `src/render/foo/bar.jsx` or `src/render/foo/bar.jsx.md`
  3. If found, render using existing logic:
     - Use cached components code (prelude)
     - Compile render target
     - Execute to get HTML string
     - Inject live reload script before `</body>` or at end (see section 4)
     - Set `Cache-Control: no-store` header
     - Send HTML response with `Content-Type: text/html`
  4. If not found, fall through to next route

#### Route 3: Static Files
- Pattern: `GET /*` (catch-all, lower priority than render targets)
- Logic:
  1. Check if file exists in `src/static/` with same path structure
     - `/css/main.css` → look for `src/static/css/main.css`
     - `/images/logo.png` → look for `src/static/images/logo.png`
     - `/favicon.ico` → look for `src/static/favicon.ico`
  2. Use `express.static('src/static')` middleware
  3. Ensure MIME types for all extensions in `isValidFilename()`:
     - `.css`, `.html`, `.js` (standard)
     - `.otf`, `.ttf`, `.woff`, `.woff2`, `.eot` (fonts)
     - `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg` (images)
     - `.xml`, `.txt` (text files)
  4. If file not found, return 404

#### Route 4: Root/Index Fallback
- Pattern: `GET /` (exact match)
- Special case of Route 2:
  1. Look for `src/render/index.jsx` or `src/render/index.jsx.md`
  2. If found, render and serve
  3. If not found, return 404 (no directory listing per decision #1)

### 4. Live Reload Implementation

#### Client-Side Script
Create inline script to inject into HTML responses:
```javascript
// Minimal SSE client that connects to /bray-live-reload
// On 'reload' message, call location.reload()
```

#### Server-Side
- Maintain array of open SSE connections
- When file changes detected, broadcast 'reload' event to all connections
- Clean up closed connections

### 5. Integrate File Watcher with Server
**File:** `src/index.js`

Modify `testMain2()` function:
- Extract file watching logic into separate function `watchFiles(inputRoot, callback)`
- In develop mode:
  1. Determine `inputRoot` from `options.develop` (should point to `src/` directory)
  2. Build initial components code (prelude) from `src/components/`
  3. Start Express server with:
     - Port from `options.port` (default 8000)
     - Reference to components code (will be updated on changes)
     - Paths to `src/render/` and `src/static/`
  4. Setup file watcher on `inputRoot` (recursive) that:
     - On component file change: rebuilds components code, triggers live reload
     - On render file change: triggers live reload
     - On static file change: triggers live reload
  5. Log server start message: `Bray dev server running at http://localhost:8000`
  6. Log: `Watching src/ for changes...`

### 6. Refactor Rendering Logic
**File:** `src/index.js`

Create reusable functions for the server:
- `buildComponentsCode(componentsPaths)`: Returns prelude string
- `renderPage(renderPath, componentsCode)`: Returns HTML string
- These extract logic from current `realMain()` function

### 7. Error Handling
- Wrap render logic in try/catch
- On error:
  - Log detailed error to console with stack trace
  - Return generic 500 response to browser
  - Don't crash server; keep it running

### 8. Update Main Entry Point
**File:** `src/index.js`

In `testMain2()`:
- If `options.develop`:
  - Start server mode (new implementation)
- If `options.src`:
  - Use existing static build mode (`realMain()`)

## File Structure Summary

```
src/
  index.js           # Modified: add port option, integrate server
  server.js          # New: Express server setup and routes
  BrayElem.js        # No changes
  commonmark.cjs     # No changes
  exports.js         # No changes
  tree.js            # No changes
```

## Testing Plan

### Manual Testing
1. Create test project with src/components/, src/render/, src/static/
2. Start dev server: `bray --develop src`
3. Verify:
   - HTML pages render correctly
   - Static files serve correctly
   - File changes trigger browser reload
   - Errors don't crash server
   - Custom port works: `bray -d src -p 3000`

### Test Cases
- `GET /index.html` → Renders `src/render/index.jsx` (or `.jsx.md`)
- `GET /about.html` → Renders `src/render/about.jsx` (or `.jsx.md`)
- `GET /foo/bar.html` → Renders `src/render/foo/bar.jsx` (preserves folder structure)
- `GET /css/main.css` → Serves `src/static/css/main.css` (no `/static/` in URL)
- `GET /images/logo.png` → Serves `src/static/images/logo.png`
- `GET /fonts/myfont.woff2` → Serves `src/static/fonts/myfont.woff2` with correct MIME type
- Change component file → all open browsers reload
- Change render file → all open browsers reload
- Change static file → all open browsers reload
- Syntax error in JSX → detailed error in console, generic 500 in browser, server stays up
- Request non-existent file → 404
- Multiple browsers connected → all reload simultaneously on any file change

## Decisions Made

1. **Directory listing**: No directory listing, return 404 if no index exists ✓

2. **Cache busting**: Add `Cache-Control: no-store` header for HTML responses ✓

3. **MIME types**: Verify all extensions from `isValidFilename()` work correctly:
   - Express should handle most, but we'll explicitly configure if needed ✓

4. **File watching depth**: Use recursive watching (`{ recursive: true }`) ✓

5. **Concurrent builds**: Accept eventual consistency - if file changes during render, next request gets the new version. User can manually reload (Cmd+R) if needed. ✓

## Success Criteria

✅ Server starts on specified port (default 8000)
✅ HTML requests render corresponding .jsx/.jsx.md files, preserving folder structure
✅ Static files serve from `src/static/` WITHOUT `/static/` prefix in URLs
✅ All file extensions from `isValidFilename()` serve with correct MIME types
✅ Browser auto-reloads when any source file changes (components, render, or static)
✅ Errors logged to console, server stays running
✅ Minimal logging (file changes and errors only)
✅ Works with all existing Bray features (Markdown, components, layouts, etc.)
✅ Components namespace is flattened (folder organization in `src/components/` is for organization only)

## Migration Notes

- No breaking changes to existing API
- Static build mode (`-s` or `--src`) remains unchanged
- Development server is opt-in via `--develop` flag
