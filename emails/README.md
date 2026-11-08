# Echo email templates

These are the complete welcome, verification and password-reset HTML bodies used by the existing Apps Script v3 EmailTemplates sheet. Run `npm run emails:build` to regenerate them. The original PNG logos are served publicly from `dist/assets/brand` on GitHub Pages.

The support footer displays **admin@echomusic.com** and links to **mailto:admin.echomusic@gmail.com**. The template Reply-To is the Gmail address. This changes the support contact, not the authenticated Apps Script sender account.

The script substitutes `{{display_name}}` in the welcome template and `{{email}}` / `{{action_url}}` in authentication templates with escaped, real request data. Reset links are still generated server-side, expire in 30 minutes, and work once. Logo and layout edits do not change token handling.

The light logo is the default for the light email card. Mail clients supporting dark-mode media queries show the dark logo on a dark card. Clients blocking remote pictures still display the Echo alt text and the functional email text and links. Actual mail rendering depends on the recipient's mail client.

Publish the original logo assets first, then replace only EmailTemplates.html_body and reply_to for the existing rows. Preserve custom subjects and current enabled flags. No Apps Script deployment is needed for this template update, and saving a template does not send an email.
