export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function renderLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
            <tr><td style="font-size:20px;font-weight:600;color:#111827;padding-bottom:16px;">${title}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;color:#374151;">${bodyHtml}</td></tr>
            <tr><td style="font-size:12px;color:#9ca3af;padding-top:32px;border-top:1px solid #e5e7eb;">
              If you didn't request this, you can safely ignore this email.
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function actionButton(url: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${url}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">${label}</a>
  </p>
  <p style="font-size:13px;color:#6b7280;">Or paste this link into your browser:<br>${url}</p>`;
}
