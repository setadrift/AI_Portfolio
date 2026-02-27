# Git Commit & Push

When this skill is invoked, walk through the full git add, commit, and push workflow:

1. Run `git status` to see all untracked and modified files
2. Run `git diff` (staged + unstaged) to review every change
3. Run `git log --oneline -5` to match the repo's commit message style
4. Analyze all changes and draft a detailed commit message:
   - Start with a concise summary line (imperative mood, under 72 chars)
   - Follow with a blank line and a bullet-point body explaining what changed and why
   - Group related changes logically (e.g., new files, modified files, config changes)
   - End with the co-author trailer
5. Stage the relevant files with `git add` (prefer naming specific files over `git add .`)
6. Commit using a heredoc for proper formatting
7. Push to the current branch with `git push`
8. Show the final `git status` and `git log --oneline -3` to confirm success

Rules:
- Never commit .env, .env.local, credentials, or secrets
- Never use --force, --no-verify, or --amend unless explicitly asked
- If a pre-commit hook fails, fix the issue and create a new commit — never amend
- Always show the drafted commit message to the user for approval before committing
- If there are no changes to commit, say so and stop
