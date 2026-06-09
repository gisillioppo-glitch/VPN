function isTelegramEnabled(config) {
  return Boolean(config.telegramBotToken && config.telegramChatId);
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

async function sendTelegramMessage(config, text) {
  if (!isTelegramEnabled(config)) {
    return { sent: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Telegram provider ${response.status}: ${message}`);
  }

  return { sent: true };
}

export function createTelegramService(config) {
  return {
    sendSentinelAlert: ({ device, event }) =>
      sendTelegramMessage(
        config,
        [
          `*ORBIT Sentinel ${escapeMarkdown(event.severity.toUpperCase())} Alert*`,
          "",
          `*Device:* ${escapeMarkdown(device.name)} \\(#${escapeMarkdown(device.id)}\\)`,
          `*Owner:* ${escapeMarkdown(device.owner)}`,
          `*Platform:* ${escapeMarkdown(device.platform)}`,
          `*Trust:* ${escapeMarkdown(device.trustScore)}`,
          "",
          `*Event:* ${escapeMarkdown(event.eventType)}`,
          `*Summary:* ${escapeMarkdown(event.summary)}`,
          `*Time:* ${escapeMarkdown(event.createdAt)}`,
          `*Source IP:* ${escapeMarkdown(event.sourceIp || "unknown")}`,
          "",
          "Review the Sentinel timeline and inspect the device if this was unexpected\\.",
        ].join("\n")
      ),
  };
}
