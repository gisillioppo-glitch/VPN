function isNtfyEnabled(config) {
  return Boolean(config.ntfyBaseUrl && config.ntfyTopic);
}

function getPriority(severity) {
  if (severity === "critical") return "urgent";
  if (severity === "suspicious") return "high";
  return "default";
}

async function sendNtfyMessage(config, { title, message, priority, tags }) {
  if (!isNtfyEnabled(config)) {
    return { sent: false, reason: "ntfy_not_configured" };
  }

  const headers = {
    Title: title,
    Priority: priority,
    Tags: tags.join(","),
  };

  if (config.ntfyToken) {
    headers.Authorization = `Bearer ${config.ntfyToken}`;
  }

  const response = await fetch(
    `${config.ntfyBaseUrl}/${encodeURIComponent(config.ntfyTopic)}`,
    {
      method: "POST",
      headers,
      body: message,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ntfy provider ${response.status}: ${body}`);
  }

  return { sent: true };
}

export function createNtfyService(config) {
  return {
    sendSentinelAlert: ({ device, event }) =>
      sendNtfyMessage(config, {
        title: `ORBIT Sentinel ${event.severity.toUpperCase()}`,
        priority: getPriority(event.severity),
        tags: ["warning", "shield"],
        message: [
          `Device: ${device.name}`,
          `Event: ${event.eventType}`,
          `Summary: ${event.summary}`,
          `Time: ${event.createdAt}`,
          `Trust score: ${device.trustScore}`,
        ].join("\n"),
      }),
  };
}
