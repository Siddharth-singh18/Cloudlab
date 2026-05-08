const router = require('express').Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

router.post('/', auth, (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 8);
    let ext = '';
    let command = '';

    if (language === 'javascript') {
      ext = '.js';
      command = 'node';
    } else if (language === 'python') {
      ext = '.py';
      command = 'python3';
    } else {
      return res.status(400).json({ error: 'Language not supported for execution yet' });
    }

    const os = require('os');
    const filePath = path.join(os.tmpdir(), `temp_${id}${ext}`);
    fs.writeFileSync(filePath, code);

    exec(`${command} ${filePath}`, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (error) {
        if (error.killed) {
          return res.json({ output: 'Error: Execution timed out.' });
        }
        return res.json({ output: stderr || error.message });
      }
      
      res.json({ output: stdout || 'Executed successfully with no output.' });
    });
  } catch (err) {
    console.error('Execute route error:', err);
    res.status(500).json({ error: 'Internal server error during execution' });
  }
});

module.exports = router;
