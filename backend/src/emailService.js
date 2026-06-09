function isEmailEnabled(config) {
  return Boolean(config.resendApiKey && config.emailFrom);
}

async function sendEmail(config, { to, subject, text }) {
  if (!isEmailEnabled(config) || !to) {
    return { sent: false, reason: "email_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email provider ${response.status}: ${message}`);
  }

  return { sent: true };
}

export function createEmailService(config) {
  return {
    sendRequestReceived: (client) =>
      sendEmail(config, {
        to: client.email,
        subject: `${config.brandName}: request received`,
        text: `Hi ${client.name},

We received your ${config.brandName} access request.

Status: pending review
Plan: ${client.plan}

We will review payment and availability, then send your private Outline access key if approved.

Support: ${config.supportEmail}
`,
      }),

    sendAccessApproved: (client) =>
      sendEmail(config, {
        to: client.email,
        subject: `${config.brandName}: your private access key is ready`,
        text: `Hi ${client.name},

Your ${config.brandName} access was approved.

Install Outline Client:
https://getoutline.org/get-started/#step-3

Paste this access key into Outline Client:
${client.outlineAccessUrl}

Keep this key private. If you lose it or need a reset, contact ${config.supportEmail}.
`,
      }),

    sendAdminNotification: (client) =>
      sendEmail(config, {
        to: config.adminNotifyEmail,
        subject: `${config.brandName}: new pending request`,
        text: `New pending access request:

Name: ${client.name}
Email: ${client.email}
Plan: ${client.plan}
Client ID: ${client.id}
Status: ${client.status}
`,
      }),

    sendSentinelAlert: ({ device, event }) =>
      sendEmail(config, {
        to: config.sentinelAlertEmail,
        subject: `${config.brandName}: Sentinel ${event.severity} alert`,
        text: `ORBIT Sentinel alert

Severity: ${event.severity}
Event: ${event.eventType}
Summary: ${event.summary}
Time: ${event.createdAt}

Device:
- ID: ${device.id}
- Name: ${device.name}
- Owner: ${device.owner}
- Platform: ${device.platform}
- Status: ${device.status}
- Trust score: ${device.trustScore}

Observed source IP: ${event.sourceIp || "unknown"}

Recommended action:
Open the Sentinel timeline, verify whether this was expected, and inspect the device if it was not.
`,
      }),
  };
}
