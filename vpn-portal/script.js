const canvas = document.querySelector("#starfield");
const ctx = canvas.getContext("2d");
const portal = document.querySelector(".portal");
const modules = document.querySelectorAll(".holo-module");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const copyButton = document.querySelector("#copyKey");
const accessKey = document.querySelector("#accessKey");

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

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  });
});

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    button.textContent = `${plan} access requested`;
    button.disabled = true;
    setTimeout(() => {
      button.textContent = "Request Access";
      button.disabled = false;
    }, 1700);
  });
});

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
