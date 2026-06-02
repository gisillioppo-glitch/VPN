const canvas = document.querySelector("#starfield");
const ctx = canvas.getContext("2d");
const portal = document.querySelector(".portal");
const modules = document.querySelectorAll(".holo-module, .void-card, .mission-dashboard");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const copyButton = document.querySelector("#copyKey");
const accessKey = document.querySelector("#accessKey");
const orbitNodes = document.querySelectorAll(".orbit-node");
const nodeReadout = document.querySelector(".node-readout");
const serverNodes = document.querySelectorAll(".server-node");
const accessForm = document.querySelector("#accessForm");
const formStatus = document.querySelector("#formStatus");

let stars = [];
let pointerX = 0;
let pointerY = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = Array.from({ length: Math.min(180, Math.floor(window.innerWidth / 6)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    z: Math.random() * 1 + 0.2,
    speed: Math.random() * 0.22 + 0.04,
    radius: Math.random() * 1.7 + 0.2,
  }));
}

function renderStars() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const star of stars) {
    star.y += star.speed * star.z;
    star.x += pointerX * 0.002 * star.z;
    if (star.y > window.innerHeight + 10) star.y = -10;
    if (star.x > window.innerWidth + 10) star.x = -10;
    if (star.x < -10) star.x = window.innerWidth + 10;

    ctx.beginPath();
    ctx.fillStyle = `rgba(180, 220, 255, ${0.28 + star.z * 0.44})`;
    ctx.arc(star.x, star.y, star.radius * star.z, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(renderStars);
}

function handlePointer(event) {
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;
  pointerX = x * 36;
  pointerY = y * 24;
  if (portal) {
    portal.style.transform = `translate3d(${pointerX * 0.22}px, ${pointerY * 0.16}px, 0) rotateY(${x * 10 - 4}deg) rotateX(${-y * 5}deg)`;
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.2 }
);

modules.forEach((module) => observer.observe(module));

serverNodes.forEach((node) => {
  const load = Number(node.dataset.load || 0);
  node.style.setProperty("--load", `${Math.max(0, Math.min(load, 100))}%`);
});

const barObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("visible", entry.isIntersecting);
    });
  },
  { threshold: 0.34 }
);

serverNodes.forEach((node) => barObserver.observe(node));

orbitNodes.forEach((node) => {
  node.addEventListener("click", () => {
    orbitNodes.forEach((item) => item.classList.toggle("active", item === node));
    if (nodeReadout) {
      const label = node.dataset.node || "ORBIT";
      nodeReadout.innerHTML = `<strong>${label}</strong> Secure gateway path synced through the ORBIT control mesh.`;
    }
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  });
});

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function selectPlan(plan) {
  if (!accessForm) return;
  const planInput = accessForm.elements.plan;
  if (planInput) planInput.value = plan;
  accessForm.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => accessForm.elements.name?.focus(), 520);
}

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    selectPlan(button.dataset.plan || "starter");
  });
});

if (accessForm) {
  accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const apiBaseUrl = window.ORBIT_CONFIG?.apiBaseUrl?.replace(/\/+$/, "");
    const payload = {
      name: accessForm.elements.name.value.trim(),
      email: accessForm.elements.email.value.trim(),
      plan: accessForm.elements.plan.value,
    };

    if (!apiBaseUrl) {
      setFormStatus(
        "Beta requests are being approved manually right now. Message us with your name, email, and plan.",
        "error"
      );
      return;
    }

    setFormStatus("Sending request...");
    const submitButton = accessForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch(`${apiBaseUrl}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Request failed");
      }

      accessForm.reset();
      setFormStatus("Request received. Check your email for confirmation after review.", "success");
    } catch (error) {
      setFormStatus(error.message || "Could not send request. Try again soon.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

if (copyButton && accessKey) {
  copyButton.addEventListener("click", async () => {
    const value = accessKey.textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Select";
    }
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1400);
  });
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointer);
resizeCanvas();
renderStars();
