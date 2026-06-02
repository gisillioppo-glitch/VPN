const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const copyButton = document.querySelector("#copyKey");
const accessKey = document.querySelector("#accessKey");

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
    button.textContent = `${plan} requested`;
    button.disabled = true;
    setTimeout(() => {
      button.textContent = "Request Access";
      button.disabled = false;
    }, 1800);
  });
});

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
