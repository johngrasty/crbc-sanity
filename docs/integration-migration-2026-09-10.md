# Integration migration, September 10, 2026

The Studio deployment command completed successfully for https://crbc.sanity.studio/ and confirmed schema deployment. The hosted URL redirects anonymous visitors to Sanity sign-in. Authenticated editor UI verification remains outstanding.

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

Legacy field removal and the separate recovered event changes remain pending.
