// Claude Code PostToolUse hook target (see .claude/settings.json), invoked as
// `yarn format:edited` after every Edit/Write tool call.
//
// Claude Code passes the tool-call payload as JSON on stdin — the edited file
// path is not available as an argument or env var, which is why this wrapper
// exists instead of calling prettier directly. It extracts the path and runs
// the repo's own Prettier (so .prettierrc, .editorconfig and .prettierignore
// all apply) on that single file only: never a repo-wide sweep, so files that
// are not Prettier-clean at HEAD are left alone unless actually edited.
//
// Best-effort by design: any parse or formatting error is swallowed so the
// hook can never block an edit.

const { spawnSync } = require('child_process');

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const filePath = (payload.tool_input || {}).file_path || '';

    const isTypeScript = /\.(ts|tsx)$/.test(filePath);
    const isAppCode = /(^|\/)(src|pages)\//.test(filePath);
    if (!isTypeScript || !isAppCode) return;

    spawnSync('yarn', ['prettier', '--write', filePath], { stdio: 'ignore' });
  } catch (_) {
    // Never block the edit.
  }
});
