# Draft preview setup

Draft preview supports announcements, ministries, articles and generic pages. An editor
adds a slug and clicks Preview in Studio. The action uses the signed-in Sanity client to
create a short-lived preview secret, then opens the website's `/api/preview` route. The
website validates that secret before issuing its preview cookie. Singleton page links
open their public routes and do not activate draft preview.

Set `SANITY_STUDIO_PREVIEW_URL` to the website origin in the Studio environment. In the
website environment, configure the Sanity project and dataset, a server-only read token
with draft access. The website also uses its server-only Sanity token to sign the
preview session; no separate signing variable is required.
Do not add a preview password or Sanity API token to the Studio environment.

The editor needs permission to create draft documents. The
[Sanity preview-secret package](https://github.com/sanity-io/visual-editing/tree/main/packages/preview-url-secret#permissions-model)
describes permissions for custom roles. The website and Studio must use the same dataset.

## Check the flow

1. Start both applications and sign in to Studio.
2. Open a supported document with a slug and make an unpublished text change.
3. Click Preview and confirm the draft text and preview banner appear.
4. Exit preview and confirm the published text appears.
5. Open `/api/preview?type=article&slug=example` without a preview secret and confirm the
   website rejects it. Setting a plain `preview=true` cookie must not expose drafts.

If Preview fails, check the editor's Sanity permissions, frontend environment and network
connection. A slug is required. Do not paste preview links or cookies into logs or tickets;
a preview link grants temporary access to draft content.
