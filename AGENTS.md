# Instructions for AI agents and developers

1. Read ARCHITECTURE-ESSENTIALS.md, then HANDOVER.md, before changing anything. Update HANDOVER.md and docs/CHANGELOG.md with every change.
2. **Commits:**
   - Commit to `main` only: no branches and no pull requests.
   - Make ONE commit per change, containing `index.html`, the 9 rebuilt pages, any `api/` files and the docs. Vercel's Hobby plan allows about 100 deploys a day.
   - Never commit in parallel.
3. **Build:** `rm -f _shot.html && python3 scripts/build_pages.py`. It must print `built 10`.
4. **Editing `index.html`:**
   - Add CSS before the FIRST `</style>` (`s.index`). The last `</style>` is inside an invoice template string.
   - Add JS before the last `</script>`.
   - Wrap existing functions; do not rewrite them.
   - Use a new global prefix, and check that a name is unused before adding it.
5. **Security rules:**
   - Escape every user value with `esc()` before putting it in HTML.
   - Validate input on the server as well (database functions and constraints).
   - Every new table gets row-level security.
   - Privileged SQL goes in `security definer` functions that check `auth.uid()` or `assert_staff()`, and that never reuse a column name as a parameter name.
   - Every new API function starts with `guard(req, res, ...)`.
   - Secrets live in Vercel environment variables only.
   - A new CDN script needs a pinned version and an `integrity` hash, and its origin must be added to the CSP in `vercel.json`.
6. **Never:**
   - use class names starting with `ad-`
   - use webfonts or emojis
   - fake data
   - remove a fallback for a migration that has not been run
   - write to `.github/workflows` (the token cannot)
7. **Testing:**
   - Run `tests/admin/*.js`, three or four per call: `timeout 13 node tests/admin/<t>.js | grep -v "Not implemented" | tail -1` should end in `errs []`.
   - Run `python3 tests/app/photo_crop.py`.
   - Check phone width, 390px.
8. **Database changes:** a new numbered migration that is safe to re-run. Agnes runs it in the Supabase SQL Editor. Until then, the app must keep working.
