const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Locate PHP binary: check custom path, XAMPP path, then system PATH
const PHP_BIN = process.env.PHP_PATH || (fs.existsSync('C:\\xampp\\php\\php.exe') ? 'C:\\xampp\\php\\php.exe' : 'php');

/**
 * Robust fallback renderer for PHP templates when PHP CLI binary is not installed in environment
 */
function renderPhpFallback(phpFile, res) {
  try {
    let content = fs.readFileSync(phpFile, 'utf8');
    const publicDir = path.dirname(phpFile);

    // Extract $pageTitle
    const titleMatch = content.match(/\$pageTitle\s*=\s*["']([^"']+)["']/);
    const pageTitle = titleMatch ? titleMatch[1] : 'TeamSync — Tasks & Projects';

    // Read header and footer templates
    const headerPath = path.join(publicDir, 'includes', 'header.php');
    const footerPath = path.join(publicDir, 'includes', 'footer.php');

    let headerHtml = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
    let footerHtml = fs.existsSync(footerPath) ? fs.readFileSync(footerPath, 'utf8') : '';

    // Replace PHP tags in header
    headerHtml = headerHtml
      .replace(/<\?php[\s\S]*?\?>/g, '')
      .replace(/<\?php\s+echo\s+htmlspecialchars\(\$pageTitle\);\s*\?>/g, pageTitle)
      .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);

    // Replace PHP tags in footer
    footerHtml = footerHtml.replace(/<\?php[\s\S]*?\?>/g, '');

    // Replace include statements in main content
    let rendered = content
      .replace(/<\?php[\s\S]*?include\s+__DIR__\s*\.\s*['"]\/includes\/header\.php['"];[\s\S]*?\?>/gi, headerHtml)
      .replace(/<\?php[\s\S]*?include\s+__DIR__\s*\.\s*['"]\/includes\/footer\.php['"];[\s\S]*?\?>/gi, footerHtml)
      .replace(/<\?php[\s\S]*?\?>/g, '');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(rendered);
  } catch (err) {
    console.error('[PHP_FALLBACK_ERROR]', err);
    return res.status(500).send(`<h3>Template Rendering Error</h3><pre>${err.message}</pre>`);
  }
}

function phpHandler(publicDir) {
  return (req, res, next) => {
    // Check if request is for a .php file or if URL maps to a .php file
    let reqPath = req.path;
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.php';
    }

    // Append .php if request matches a php file without extension (e.g. /register -> /register.php)
    let phpFile = path.join(publicDir, reqPath);
    if (!phpFile.endsWith('.php') && fs.existsSync(phpFile + '.php')) {
      phpFile += '.php';
    }

    if (!phpFile.endsWith('.php') || !fs.existsSync(phpFile)) {
      return next();
    }

    // Execute PHP script
    execFile(PHP_BIN, [phpFile], {
      env: {
        ...process.env,
        REQUEST_METHOD: req.method,
        REQUEST_URI: req.originalUrl,
        QUERY_STRING: req.url.split('?')[1] || '',
        SERVER_NAME: req.hostname,
        SERVER_PORT: String(process.env.PORT || 3000)
      }
    }, (error, stdout, stderr) => {
      if (error) {
        // Fallback gracefully without 500
        return renderPhpFallback(phpFile, res);
      }

      // Detect any PHP headers or send as text/html
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(stdout);
    });
  };
}

module.exports = {
  phpHandler,
  renderPhpFallback,
  PHP_BIN
};
