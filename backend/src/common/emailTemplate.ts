export interface DriverVerificationEmailProps {
  driverName: string;
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
  year?: number;
}

export interface DriverWarningEmailProps {
  driverName: string;
  level: string;
  reason: string;
  year?: number;
}

export interface BroadcastEmailProps {
  caption: string;
  subheading?: string;
  bodyHtml: string;
  previewText?: string;
  supportEmail?: string;
  year?: number;
}

function sanitizeEmailHtml(bodyHtml: string): string {
  const withoutScripts = bodyHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');

  const allowedTagsPattern = /<(?!\/?(?:a|strong|em|u|br|span|b|i|p|ul|ol|li)\b)[^>]+>/gi;
  const allowedOnly = withoutScripts.replace(allowedTagsPattern, '');

  return allowedOnly.replace(/<a\b([^>]*)href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>/gi, (_match, before, _raw, dqHref, sqHref, bareHref, after) => {
    const href = String(dqHref || sqHref || bareHref || '').trim();
    const safeHref = /^(https?:\/\/|mailto:|tel:)/i.test(href) ? href : '#';
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${before || ''}${after || ''}>`;
  });
}

export function generateDriverVerificationEmail({
  driverName,
  status,
  reason,
  year = new Date().getFullYear(),
}: DriverVerificationEmailProps): string {
  const configs = {
    approved: {
      caption: 'Your Driver Account Has Been Approved',
      subheading: "You're verified and ready to drive",
      bodyHtml: `<p>Congratulations <strong>${driverName}</strong>! Your driver account has been reviewed and <strong>approved</strong>.</p><p>You can now log in to the edrive app and start accepting ride requests. Welcome to the team!</p>`,
    },
    rejected: {
      caption: 'edrive Verification Update',
      subheading: 'Your verification could not be completed',
      bodyHtml: `<p>Dear <strong>${driverName}</strong>, unfortunately we were unable to approve your driver account at this time.${reason ? `</p><p><strong>Reason:</strong> ${reason}` : ''}</p><p>Please ensure your submitted documents are clear, valid, and up-to-date. You may resubmit your documents for another review. Contact our support team if you need assistance.</p>`,
    },
    pending: {
      caption: 'Your Documents Are Under Review',
      subheading: "We've received your submission",
      bodyHtml: `<p>Hi <strong>${driverName}</strong>, thank you for submitting your documents for driver verification.</p><p>Our team is reviewing your information and will notify you as soon as the process is complete. This typically takes <strong>1–2 business days</strong>.</p><p>You'll receive another email once a decision has been made.</p>`,
    },
  };

  const config = configs[status];
  return generateBroadcastEmailHtml({
    caption: config.caption,
    subheading: config.subheading,
    bodyHtml: config.bodyHtml,
    year,
  });
}

export function generateDriverWarningEmail({
  driverName,
  level,
  reason,
  year = new Date().getFullYear(),
}: DriverWarningEmailProps): string {
  const levelUpper = level.toUpperCase();
  const bodyHtml = `<p>Dear <strong>${driverName}</strong>,</p>
<p>You have received a <strong>${levelUpper} WARNING</strong> from the edrive team.</p>
<p><strong>Reason:</strong> ${reason}</p>
<p>Please review our community guidelines and ensure compliance to avoid further action. Repeated violations may result in suspension or permanent removal from the platform.</p>
<p>If you believe this warning was issued in error, please contact our support team and we will review your case.</p>`;

  return generateBroadcastEmailHtml({
    caption: `Account Warning — ${level.charAt(0).toUpperCase() + level.slice(1)}`,
    subheading: 'Important notice from the edrive team',
    bodyHtml,
    year,
  });
}

export function generateBroadcastEmailHtml({
  caption,
  subheading,
  bodyHtml,
  previewText = '',
  supportEmail = 'support@edriveapp.com',
  year = new Date().getFullYear(),
}: BroadcastEmailProps): string {
  const safeBody = sanitizeEmailHtml(bodyHtml);

  const styledBody = safeBody.replace(
    /<a\s/gi,
    '<a style="color:#2ec866;text-decoration:underline;font-weight:600;" '
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <title>${caption}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
    body, table, td { margin: 0; padding: 0; border: 0; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 600px) {
      .outer-table { width: 100% !important; }
      .inner-cell { padding: 32px 20px !important; }
      .caption-text { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:'DM Sans',Helvetica,Arial,sans-serif;">

  ${previewText ? `<div style="display:none;font-size:1px;color:#111111;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}&zwnj;&nbsp;</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background-color:#111111;padding:48px 16px;">
    <tr>
      <td align="center">

        <table class="outer-table" width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="border-radius:20px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#005124;padding:28px 40px;text-align:center;">
              <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;
                color:#ffffff;letter-spacing:-0.5px;"><span style="display:inline-block;font-style:italic;transform:skew(-14deg) rotate(-8deg);transform-origin:50% 60%;margin-right:1px;">e</span>drive</p>
              <p style="margin:6px 0 0;font-size:12px;color:#a3d4b5;letter-spacing:0.8px;text-transform:uppercase;">
               travel with comfort
              </p>
            </td>
          </tr>

          <!-- DECORATIVE DIVIDER -->
          <tr>
            <td style="background:linear-gradient(90deg,#005124 0%,#2ec866 50%,#005124 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="inner-cell" style="background-color:#181818;padding:48px 40px;">

              <h1 class="caption-text"
                style="margin:0 0 ${subheading ? '14px' : '24px'};
                  font-family:'DM Serif Display',Georgia,serif;
                  font-size:32px;font-weight:400;line-height:1.2;
                  color:#f5f5f5;letter-spacing:-0.5px;">
                ${caption}
              </h1>

              ${subheading ? `
              <p style="margin:0 0 28px;font-size:16px;font-weight:500;color:#2ec866;line-height:1.5;
                letter-spacing:0.1px;">
                ${subheading}
              </p>` : ''}

              <div style="width:48px;height:2px;background:#2ec866;margin:0 0 32px;border-radius:2px;"></div>

              <div style="font-size:15px;color:#c0c0c0;line-height:1.8;word-break:break-word;">
                ${styledBody}
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#111111;padding:24px 40px;border-top:1px solid #222222;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;color:#555555;">
                      If you'd like to report an issue, reach out to
                      <a href="mailto:${supportEmail}"
                        style="color:#2ec866;text-decoration:underline;">edrive support</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#444444;letter-spacing:0.2px;">
                      &copy; ${year} edrive Technologies. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
