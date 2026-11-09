const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Locate PHP binary: check custom path, XAMPP path, then system PATH
const PHP_BIN = process.env.PHP_PATH || (fs.existsSync('C:\\xampp\\php\\php.exe') ? 'C:\\xampp\\php\\php.exe' : 'php');

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
        console.error('[PHP_EXEC_ERROR]', stderr || error);
        return res.status(500).send(`<h3>PHP Rendering Error</h3><pre>${stderr || error.message}</pre>`);
      }

      // Detect any PHP headers or send as text/html
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(stdout);
    });
  };
}

module.exports = {
  phpHandler,
  PHP_BIN
};
