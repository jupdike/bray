import express from 'express';
import path from 'path';
import fs from 'fs';

const Path = path;

// Live reload client script (injected into HTML responses)
const liveReloadScript = `
<script>
(function() {
  const source = new EventSource('/bray-live-reload');
  source.onmessage = function(e) {
    if (e.data === 'reload') {
      console.log('Bray: files changed, reloading...');
      location.reload();
    }
  };
  source.onerror = function() {
    console.error('Bray: live reload connection lost, trying to reconnect...');
  };
})();
</script>
`;

// Create and configure the Express server
export function createServer(options) {
  const {
    port = 8000,
    inputRoot = 'src',
    renderPage,
    staticRoot
  } = options;

  const app = express();
  const sseConnections = [];

  // Helper function to inject live reload script into HTML
  function injectLiveReload(html) {
    // Try to inject before </body>, or at the end if no </body> tag
    if (html.includes('</body>')) {
      return html.replace('</body>', liveReloadScript + '</body>');
    } else {
      return html + liveReloadScript;
    }
  }

  // Route 1: Live Reload SSE Endpoint (highest priority)
  app.get('/bray-live-reload', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add this connection to our list
    sseConnections.push(res);

    // Remove connection when client disconnects
    req.on('close', () => {
      const index = sseConnections.indexOf(res);
      if (index !== -1) {
        sseConnections.splice(index, 1);
      }
    });
  });

  // Route 2: Static Files (serve first for performance)
  const staticDir = Path.join(inputRoot, 'static');
  app.use(express.static(staticDir));

  // Route 3: HTML Render Targets (use middleware for all requests)
  app.use(async (req, res, next) => {
    const requestedPath = req.path;

    // Skip if this is a static file that was already served
    const ext = Path.extname(requestedPath);
    if (ext && ext !== '.html') {
      return next();
    }

    // Convert URL path to potential render file path
    let renderPath = null;
    let basePath = requestedPath;

    if (requestedPath === '/') {
      // Root path maps to index
      basePath = '/index.html';
    }

    if (basePath.endsWith('.html')) {
      // Remove leading slash and .html extension
      const relativePath = basePath.slice(1, -5); // remove leading '/' and '.html'

      // Look for .jsx or .jsx.md file in render directory
      const renderDir = Path.join(inputRoot, 'render');
      const jsxPath = Path.join(renderDir, relativePath + '.jsx');
      const jsxMdPath = Path.join(renderDir, relativePath + '.jsx.md');

      if (fs.existsSync(jsxPath)) {
        renderPath = jsxPath;
      } else if (fs.existsSync(jsxMdPath)) {
        renderPath = jsxMdPath;
      }
    }

    if (renderPath) {
      // Render the page
      try {
        let html = await renderPage(renderPath);
        html = injectLiveReload(html);

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store');
        res.send(html);
      } catch (error) {
        console.error('Error rendering page:', renderPath);
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      // Not a render target, continue to 404 handler
      next();
    }
  });

  // Route 4: 404 for everything else
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Function to broadcast reload event to all connected clients
  function broadcastReload() {
    sseConnections.forEach(res => {
      try {
        res.write('data: reload\n\n');
      } catch (error) {
        // Connection might be closed, ignore
      }
    });
  }

  // Start the server
  const server = app.listen(port, () => {
    console.error(`Bray dev server running at http://localhost:${port}`);
  });

  return {
    server,
    broadcastReload,
    close: () => server.close()
  };
}
