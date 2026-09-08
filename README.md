# CRBC Sanity Studio

This repository manages content for the separate `../crbc-new-site` website repository.

## Local setup

Use the Node 22.19.0 version in `.nvmrc`, for example with `nvm use`. Install the committed dependency versions with
`npm ci`, copy `.env.example` to `.env`, then set the Sanity project ID, dataset and
frontend URL. Start the Studio with `npm run dev`. For a second checkout, use
`npm run dev -- --port 3334` and point `SANITY_STUDIO_PREVIEW_URL` at that checkout's
frontend port. Keep `.env` out of Git and copy it only between trusted local checkouts.

Sanity Studio variables are included in its browser bundle. Never put Planning Center
credentials, Sanity API tokens or a shared preview password in `SANITY_STUDIO_*` variables.
The website reads Planning Center credentials from its private server environment.
Remove legacy `SANITY_STUDIO_PCO_APP_ID` and `SANITY_STUDIO_PCO_SECRET` entries from
existing Studio environment files and hosting settings.

## Verification

Run `npm run verify` before review. It checks TypeScript, lint, preview URL tests,
Sanity schema validation and the production build. The tests use a fake Sanity client;
they do not read or write content. The schema command validates definitions locally,
not existing dataset documents. No command in `verify` deploys the Studio. Studio runtime auto-updates are disabled
so a deployment runs the dependency versions checked locally.

After changing schemas, run `npm run typegen` and commit both `schema.json` and
`sanity.types.ts`. Update any corresponding queries in the website repository. Typegen
currently covers schema types only; the frontend still maintains its groqd projections.

For browser QA, sign in to the local Studio and check the following:

- Home, page settings, menus and footer open their fixed document IDs. The New document
  menu omits those singleton types, and their actions omit delete, duplicate and unpublish.
- Preview on an announcement, article, ministry or generic page opens the selected draft.
  Refresh after editing, then exit preview and confirm the published version appears.
- The public links for Beliefs and Giving open `/about/beliefs` and `/give`.

These browser checks need an authorized Sanity editor and an authenticated frontend
preview setup. They cannot be established by the offline tests alone. Generating a
preview link creates a short-lived Sanity preview-secret draft using the editor's session.
See [preview setup](ANNOUNCEMENT_PREVIEW_SETUP.md).

## Legacy Planning Center settings

The website does not read the `pcoSettings` document. Its old API credential inputs have
been removed. This schema change does not erase existing document fields or revision
history. If credentials were entered there, an administrator should rotate them in
Planning Center and remove stored secret fields from Sanity. Do not export those values
while investigating. Set replacement credentials only in the website server environment.

## Code layout

- `schemaTypes/` contains the registered content definitions.
- `structure/deskStructure.ts` organizes the editing panes.
- `structure/singletons.ts` protects types with fixed document IDs.
- `structure/preview.ts` creates authenticated draft-preview links and public page links.

Singleton protection follows the [Sanity singleton guide](https://www.sanity.io/guides/singleton-document).
It prevents duplicate creation in this Studio; it does not repair existing duplicate
content or enforce uniqueness for other API clients.

## Dependency overrides

Two scoped overrides avoid a Sanity major-version migration for transitive advisories.
`@sanity/runtime-cli` uses `adm-zip` 0.6.0 for local archive creation; its changed extraction
behavior is not used by that caller. The dependency compatibility test runs Sanity's
actual file and folder packaging functions. See the
[adm-zip release notes](https://github.com/cthackers/adm-zip/releases/tag/v0.6.0).
The nested `@sanity/uuid` uses patch 3.0.3, which updates its UUID dependency. Preview
secret tests exercise that ID generation. Remove these overrides when Sanity's declared
dependency versions include the fixes.
