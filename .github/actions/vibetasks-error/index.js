/**
 * VibeTasks Error Capture Action
 * 
 * A GitHub Action that automatically creates VibeTasks tasks when CI/CD fails.
 * This JavaScript implementation provides more robust error parsing.
 * 
 * To use this instead of the composite action:
 * 1. Uncomment the 'using: node20' in action.yml
 * 2. Run: npm init -y && npm install @actions/core @actions/github
 */

const https = require('https');
const { URL } = require('url');

// Error patterns for detection
const ERROR_PATTERNS = {
  typescript: {
    pattern: /error TS(\d+):\s*(.+)/,
    type: 'TypeScript Error',
    filePattern: /([^\s:]+\.tsx?):(\d+):(\d+)/,
  },
  eslint: {
    pattern: /(error|warning)\s+(.+?)\s+(\S+)$/m,
    type: 'ESLint Error',
    filePattern: /([^\s:]+):(\d+):(\d+)/,
  },
  jest: {
    pattern: /(FAIL|✕)\s*(.+)/,
    type: 'Test Failure',
    filePattern: /at\s+.+\(([^:]+):(\d+):(\d+)\)/,
  },
  python: {
    pattern: /(TypeError|ValueError|ImportError|ModuleNotFoundError|SyntaxError|AttributeError|KeyError|IndexError):\s*(.+)/,
    type: 'Python Error',
    filePattern: /File "([^"]+)", line (\d+)/,
  },
  node: {
    pattern: /(TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+)/,
    type: 'JavaScript Error',
    filePattern: /at\s+.+\(([^:]+):(\d+):(\d+)\)/,
  },
  npm: {
    pattern: /npm ERR!\s*(.+)/,
    type: 'npm Error',
    filePattern: null,
  },
  build: {
    pattern: /(build failed|compilation failed|failed to compile)/i,
    type: 'Build Failure',
    filePattern: /([^\s:]+):(\d+)(?::(\d+))?/,
  },
  generic: {
    pattern: /error:\s*(.+)/i,
    type: 'Error',
    filePattern: /([^\s:]+\.[a-z]+):(\d+)(?::(\d+))?/,
  },
};

/**
 * Parse error logs and extract structured information
 */
function parseErrors(logContent) {
  const lines = logContent.split('\n');
  const errors = [];
  let currentError = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and node_modules
    if (!line.trim() || line.includes('node_modules')) continue;

    // Try each error pattern
    for (const [name, config] of Object.entries(ERROR_PATTERNS)) {
      const match = line.match(config.pattern);
      if (match) {
        // Extract file location if pattern exists
        let file = null, lineNum = null, column = null;
        if (config.filePattern) {
          // Check current line and next few lines for file info
          for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 5); j++) {
            const fileMatch = lines[j].match(config.filePattern);
            if (fileMatch && !lines[j].includes('node_modules')) {
              file = fileMatch[1];
              lineNum = fileMatch[2];
              column = fileMatch[3] || null;
              break;
            }
          }
        }

        currentError = {
          type: config.type,
          message: match[match.length - 1] || line.trim(),
          file,
          line: lineNum,
          column,
          raw: line.trim(),
          context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join('\n'),
        };
        errors.push(currentError);
        break;
      }
    }
  }

  // Deduplicate by message
  const seen = new Set();
  const uniqueErrors = errors.filter(e => {
    const key = `${e.type}:${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueErrors;
}

/**
 * Generate task title from errors
 */
function generateTitle(errors, maxLength = 100) {
  if (errors.length === 0) {
    return '[CI] Build/Test Failure';
  }

  const firstError = errors[0];
  let title = `[CI] ${firstError.type}`;
  
  if (firstError.message) {
    const msg = firstError.message.substring(0, maxLength - title.length - 3);
    title += `: ${msg}`;
  }

  if (errors.length > 1) {
    title += ` (+${errors.length - 1} more)`;
  }

  return title.substring(0, maxLength);
}

/**
 * Generate task notes in markdown
 */
function generateNotes(errors, context) {
  const { workflow, job, runId, runNumber, sha, ref, actor, repository, serverUrl, errorContext } = context;

  let notes = `## CI/CD Failure Report

**Workflow:** ${workflow}
**Job:** ${job}
**Run:** [#${runNumber}](${serverUrl}/${repository}/actions/runs/${runId})
**Commit:** [${sha.substring(0, 7)}](${serverUrl}/${repository}/commit/${sha})
**Branch:** \`${ref}\`
**Triggered by:** @${actor}

### Errors Found

`;

  if (errors.length === 0) {
    notes += 'No specific errors could be parsed from the logs.\n';
  } else {
    for (const error of errors.slice(0, 10)) {
      notes += `#### ${error.type}\n\n`;
      if (error.file) {
        notes += `**File:** \`${error.file}\``;
        if (error.line) notes += `:${error.line}`;
        if (error.column) notes += `:${error.column}`;
        notes += '\n';
      }
      notes += `**Message:** ${error.message}\n\n`;
      if (error.context) {
        notes += '```\n' + error.context + '\n```\n\n';
      }
    }

    if (errors.length > 10) {
      notes += `\n*...and ${errors.length - 10} more errors*\n`;
    }
  }

  if (errorContext) {
    notes += `\n### Additional Context\n\n${errorContext}\n`;
  }

  notes += '\n---\n*Auto-generated by VibeTasks Error Capture*';

  return notes;
}

/**
 * Make HTTP request to Supabase
 */
function supabaseRequest(supabaseUrl, apiKey, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, supabaseUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: json });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Create VibeTasks task
 */
async function createTask(config, errors, context) {
  const { supabaseUrl, apiKey, userId, projectName, priority, tags } = config;

  const title = generateTitle(errors);
  const notes = generateNotes(errors, context);

  // Generate subtask UUIDs
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const subtasksJson = [
    { id: generateUUID(), title: 'Reproduce the error locally', done: false },
    { id: generateUUID(), title: 'Identify root cause', done: false },
    { id: generateUUID(), title: 'Implement fix', done: false },
    { id: generateUUID(), title: 'Verify CI passes', done: false },
  ];

  const task = {
    user_id: userId,
    title,
    notes,
    notes_format: 'markdown',
    priority,
    status: 'todo',
    project_tag: projectName,
    created_by: 'ai',
    subtasks_json: subtasksJson,
  };

  const result = await supabaseRequest(
    supabaseUrl,
    apiKey,
    'POST',
    '/rest/v1/tasks',
    task
  );

  const taskId = Array.isArray(result.data) ? result.data[0]?.id : result.data?.id;

  // Add tags
  if (tags && taskId) {
    const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    for (const tagName of tagNames) {
      try {
        // Find or create tag
        const existingTags = await supabaseRequest(
          supabaseUrl,
          apiKey,
          'GET',
          `/rest/v1/tags?name=eq.${encodeURIComponent(tagName)}&user_id=eq.${userId}`
        );

        let tagId;
        if (existingTags.data && existingTags.data.length > 0) {
          tagId = existingTags.data[0].id;
        } else {
          const newTag = await supabaseRequest(
            supabaseUrl,
            apiKey,
            'POST',
            '/rest/v1/tags',
            { user_id: userId, name: tagName, color: '#6366f1' }
          );
          tagId = Array.isArray(newTag.data) ? newTag.data[0]?.id : newTag.data?.id;
        }

        // Link tag to task
        if (tagId) {
          await supabaseRequest(
            supabaseUrl,
            apiKey,
            'POST',
            '/rest/v1/task_tags',
            { task_id: taskId, tag_id: tagId }
          ).catch(() => {}); // Ignore duplicate errors
        }
      } catch (e) {
        console.warn(`Failed to add tag "${tagName}":`, e.message);
      }
    }
  }

  return { taskId, title };
}

/**
 * Main function (for use with @actions/core)
 */
async function main() {
  // This would be the entry point if using node20 runtime
  // For now, the composite action handles everything
  console.log('VibeTasks Error Capture - JavaScript implementation');
  console.log('Use the composite action (action.yml) for the full feature set.');
}

// Export for testing
module.exports = {
  parseErrors,
  generateTitle,
  generateNotes,
  createTask,
  ERROR_PATTERNS,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
