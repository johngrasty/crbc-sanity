# Integration migration, September 10, 2026

The Studio deployment command completed successfully for https://crbc.sanity.studio/ and confirmed schema deployment. The hosted URL redirects anonymous visitors to Sanity sign-in. A signed-in Safari session opened the published Studio, its page navigation, and the Home Page editor. Individual migrated editor checks were interrupted by concurrent browser use and remain outstanding.

The production migration updated five existing documents:

| Document                     | Added fields                       |
| ---------------------------- | ---------------------------------- |
| Giving                       | Embed URL and direct giving URL    |
| Watch                        | Live stream and archive embed URLs |
| Settings                     | Newsletter signup and archive URLs |
| Life Groups                  | Planning Center group type name    |
| Administrative Assistant job | Drag ordering rank                 |

A local backup was captured before writing. A fresh API read confirmed that only the planned fields changed, every legacy field remained intact, and both migration planners returned zero remaining patches. No Community Groups page document was created; the website continues to display the six groups from Planning Center.

The integration transaction timed out after applying its four document updates. A reread established the result before the remaining job update proceeded. Both migration commands now suppress request error details and exit unsuccessfully on failure, with a reminder to verify document state before retrying.

All seventeen website paths refreshed successfully, with Community Groups succeeding on a targeted retry. Production browser checks passed at desktop and mobile widths: ten newsletter entries, the existing giving fund and frequency, video archive content, six Community Groups, six Life Groups, jobs, and the calendar. Neither run reported a JavaScript error. Unsigned preview requests remained unauthorized.

The three legacy embed fields remain hidden and read-only for rollback. Keeping their definitions prevents Sanity from showing unknown-field warnings for the preserved values. The website cleanup removes the old embed query fallbacks after the migrated URLs have been verified. This follows [Sanity's migration cleanup guidance](https://learn.sanity.build/learn/course/handling-schema-changes-confidently/tidy-up-the-schema-and-front-end-code).

The recovered event changes and the website's legacy query cleanup were released in [website PR 17](https://github.com/johngrasty/new-crbc-website/pull/17). The browser readiness checks were corrected in [website PR 18](https://github.com/johngrasty/new-crbc-website/pull/18). Its merged commit, `b798af1c36ea0fb936f4db60a397995f63cc0163`, passed [the final main branch CI run](https://github.com/johngrasty/new-crbc-website/actions/runs/34488165120) and reached a successful Vercel production deployment. Verification included 37 server tests, the built server runtime check, and 30 production browser tests with two expected viewport skips.

The Sanity CLI error during migration exposed its authentication token in diagnostic output. After explicit approval, CLI logout revoked that session. The same token returned HTTP 200 from the authenticated user endpoint before logout and HTTP 401 afterward; the saved CLI credential was also removed. The migration commands now suppress request diagnostics to prevent recurrence.
