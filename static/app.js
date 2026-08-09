const pwInput = document.getElementById("passwordInput");
const toggleBtn = document.getElementById("toggleVisibility");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");
const strengthFill = document.getElementById("strengthFill");
const strengthTag = document.getElementById("strengthTag");
const strengthPct = document.getElementById("strengthPct");
const strengthSection = document.getElementById("strengthSection");
const commonBanner = document.getElementById("commonBanner");
const statCrack = document.getElementById("statCrack");
const statScore = document.getElementById("statScore");
const adviceBanner = document.getElementById("adviceBanner");
const adviceList = document.getElementById("adviceList");
const allGoodBanner = document.getElementById("allGoodBanner");

// Toggle visibility
toggleBtn.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  eyeOpen.style.display = show ? "none" : "";
  eyeClosed.style.display = show ? "" : "none";
});

// Debounce
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// Helpers
const LABELS = { Weak: "weak", Medium: "medium", Strong: "strong" };

function setBar(pct, label) {
  strengthFill.style.width = pct + "%";
  strengthFill.className = "strength-bar-fill bg-" + LABELS[label];
  strengthTag.textContent = label;
  strengthTag.className = "strength-label label-" + LABELS[label];
  strengthPct.textContent = pct + "%";
}

function animateValue(el, target) {
  const n = parseFloat(target);
  if (!isNaN(n) && !target.includes(" ")) {
    let start = null;
    const dur = 400; // updated to match css duration-slow
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      // ease-out implementation for number
      const easeP = 1 - Math.pow(1 - p, 3);
      el.textContent = (n * easeP).toFixed(target.includes(".") ? 2 : 0);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  } else {
    el.textContent = target;
  }
}

function renderResult(data) {
  setBar(data.percentage, data.label);
  strengthSection.dataset.hidden = "false";

  // Common banner
  if (data.is_common) {
    commonBanner.dataset.hidden = "false";
  } else {
    commonBanner.dataset.hidden = "true";
  }

  // Stats
  animateValue(statCrack, data.crack_time);
  animateValue(statScore, data.score + " / 15");

  // Advice
  if (data.advice && data.advice.length) {
    adviceList.innerHTML = "";
    data.advice.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      adviceList.appendChild(li);
    });
    adviceBanner.dataset.hidden = "false";
    allGoodBanner.dataset.hidden = "true";
  } else {
    adviceBanner.dataset.hidden = "true";
    allGoodBanner.dataset.hidden = "false";
  }
}

function clearResults() {
  strengthSection.dataset.hidden = "true";
  commonBanner.dataset.hidden = "true";
  adviceBanner.dataset.hidden = "true";
  allGoodBanner.dataset.hidden = "true";
}

// Main analyse call
const analyse = debounce(async (pw) => {
  if (!pw) {
    clearResults();
    return;
  }
  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (data.error) {
      clearResults();
      return;
    }
    renderResult(data);
  } catch (e) {
    console.error(e);
  }
}, 280);

pwInput.addEventListener("input", (e) => analyse(e.target.value));

// Theme Toggle Logic
const themeToggleBtn = document.getElementById("themeToggle");
themeToggleBtn?.addEventListener("click", () => {
  let theme = document.documentElement.getAttribute("data-theme");
  if (!theme) {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const newTheme = theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});
