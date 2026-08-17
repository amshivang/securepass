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
const confidenceBadge = document.getElementById("confidenceBadge");
const inputError = document.getElementById("inputError");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const copyIcon = document.getElementById("copyIcon");
const checkIcon = document.getElementById("checkIcon");
const breachBtn = document.getElementById("breachBtn");
const breachBtnText = document.getElementById("breachBtnText");
const breachNeutralMsg = document.getElementById("breachNeutralMsg");
const breachDangerBanner = document.getElementById("breachDangerBanner");
const breachDangerText = document.getElementById("breachDangerText");
const breachSafeBanner = document.getElementById("breachSafeBanner");

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

  // Model confidence
  if (typeof data.confidence === "number" && !isNaN(data.confidence)) {
    confidenceBadge.textContent = Math.round(data.confidence) + "% confidence";
  } else {
    confidenceBadge.textContent = "";
  }

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
  confidenceBadge.textContent = "";
  inputError.dataset.hidden = "true";
}

function resetBreachResult() {
  breachNeutralMsg.dataset.hidden = "true";
  breachDangerBanner.dataset.hidden = "true";
  breachSafeBanner.dataset.hidden = "true";
}

function updateActionButtonsState() {
  const hasValue = pwInput.value.length > 0;
  breachBtn.disabled = !hasValue;
  copyBtn.disabled = !hasValue;
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
    if (!res.ok) throw new Error("Analyze request failed: " + res.status);
    const data = await res.json();
    if (data.error) {
      clearResults();
      return;
    }
    inputError.dataset.hidden = "true";
    renderResult(data);
  } catch (e) {
    console.error(e);
    inputError.dataset.hidden = "false";
  }
}, 280);

pwInput.addEventListener("input", (e) => {
  resetBreachResult();
  updateActionButtonsState();
  analyse(e.target.value);
});

// Initialize button states on load
updateActionButtonsState();

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

// Generate strong password (cryptographically secure)
const GEN_CHARSETS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnpqrstuvwxyz",
  digits: "23456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

function secureRandomInt(maxExclusive) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}

function pickRandomChar(charset) {
  return charset[secureRandomInt(charset.length)];
}

function generateStrongPassword(length) {
  const all = GEN_CHARSETS.upper + GEN_CHARSETS.lower + GEN_CHARSETS.digits + GEN_CHARSETS.symbols;

  // Guarantee at least one of each required character class
  const chars = [
    pickRandomChar(GEN_CHARSETS.upper),
    pickRandomChar(GEN_CHARSETS.lower),
    pickRandomChar(GEN_CHARSETS.digits),
    pickRandomChar(GEN_CHARSETS.symbols),
  ];

  while (chars.length < length) {
    chars.push(pickRandomChar(all));
  }

  // Fisher-Yates shuffle using crypto randomness to avoid predictable positions
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

generateBtn?.addEventListener("click", () => {
  const length = 16 + secureRandomInt(5); // 16-20 chars
  const generated = generateStrongPassword(length);

  pwInput.value = generated;
  // Reveal the generated password so the user can see/verify it immediately
  pwInput.type = "text";
  eyeOpen.style.display = "none";
  eyeClosed.style.display = "";

  resetBreachResult();
  updateActionButtonsState();
  analyse(generated);
  pwInput.focus();
});

// Copy password to clipboard
copyBtn?.addEventListener("click", async () => {
  if (!pwInput.value) return;
  try {
    await navigator.clipboard.writeText(pwInput.value);
    copyIcon.style.display = "none";
    checkIcon.style.display = "";
    copyBtn.classList.add("copied");
    clearTimeout(copyBtn._resetTimer);
    copyBtn._resetTimer = setTimeout(() => {
      copyIcon.style.display = "";
      checkIcon.style.display = "none";
      copyBtn.classList.remove("copied");
    }, 1500);
  } catch (e) {
    console.error(e);
  }
});

// Explicit, opt-in breach check (Have I Been Pwned via k-anonymity, server-side)
breachBtn?.addEventListener("click", async () => {
  const pw = pwInput.value;
  if (!pw) return;

  resetBreachResult();
  breachBtn.disabled = true;
  breachBtn.classList.add("is-loading");
  const originalLabel = breachBtnText.textContent;
  breachBtnText.textContent = "Checking…";

  try {
    const res = await fetch("/check-breach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) throw new Error("Breach check request failed: " + res.status);
    const data = await res.json();

    if (!data.checked) {
      breachNeutralMsg.dataset.hidden = "false";
    } else if (data.pwned) {
      const count = Number(data.count) || 0;
      breachDangerText.textContent =
        "This password has appeared in " + count.toLocaleString() +
        " known data breaches. Change it immediately everywhere it's used.";
      breachDangerBanner.dataset.hidden = "false";
    } else {
      breachSafeBanner.dataset.hidden = "false";
    }
  } catch (e) {
    console.error(e);
    breachNeutralMsg.dataset.hidden = "false";
  } finally {
    breachBtn.disabled = pwInput.value.length === 0;
    breachBtn.classList.remove("is-loading");
    breachBtnText.textContent = originalLabel;
  }
});
