import { Agent } from "undici";

const selfSignedDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export class OutlineClient {
  constructor({ apiUrl }) {
    this.apiUrl = apiUrl.replace(/\/+$/, "");
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      dispatcher: selfSignedDispatcher,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let body = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
    }

    if (!response.ok) {
      const message = body?.error || body?.message || response.statusText;
      throw new Error(`Outline API ${response.status}: ${message}`);
    }

    return body;
  }

  getServer() {
    return this.request("/server");
  }

  listAccessKeys() {
    return this.request("/access-keys");
  }

  createAccessKey({ name }) {
    return this.request("/access-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  renameAccessKey({ id, name }) {
    return this.request(`/access-keys/${encodeURIComponent(id)}/name`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  deleteAccessKey({ id }) {
    return this.request(`/access-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}
