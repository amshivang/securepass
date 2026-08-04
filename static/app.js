/* ── Particle stars via JS canvas ── */
(function () {
  const canvas = document.getElementById("particles-canvas");
  // Canvas removed in new design — stars are CSS only. Skip if absent.
  if (!canvas) return;
})();

/* ── DOM refs ── */
const pwInput       = document.getElementById("passwordInput");
const toggleBtn     = document.getElementById("toggleVisibility");
const eyeOpen       = document.getElementById("eyeOpen");
const eyeClosed     = document.getElementById("eyeClosed");
const strengthFill  = document.getElementById("strengthFill");
const strengthTag   = document.getElementById("strengthTag");
const strengthPct   = document.getElementById("strengthPct");
const strengthWrap  = document.getElementById("strengthBarWrap");
const commonBanner  = document.getElementById("commonBanner");
const statsRow      = document.getElementById("statsRow");
const statLabelCard = document.getElementById("statLabel");
const statLabelVal  = document.getElementById("statLabelValue");
const statLabelIcon = document.getElementById("statLabelIcon");
const statCrack     = document.getElementById("statCrack");
const statScore     = document.getElementById("statScore");
const adviceBlock   = document.getElementById("adviceBlock");
const adviceList    = document.getElementById("adviceList");
const allGoodBanner = document.getElementById("allGoodBanner");

/* ── Toggle visibility ── */
toggleBtn.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  eyeOpen.style.display   = show ? "none" : "";
  eyeClosed.style.display = show ? ""     : "none";
});

/* ── Debounce ── */
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ── Helpers ── */
const ICONS  = { Weak: "🔓", Medium: "🔐", Strong: "🛡️" };
const LABELS = { Weak: "weak", Medium: "medium", Strong: "strong" };

function show(el) { el.style.display = ""; }
function hide(el) { el.style.display = "none"; }

function setBar(pct, label) {
  strengthFill.style.width = pct + "%";
  strengthFill.className   = "strength-fill " + LABELS[label];
  strengthTag.textContent  = label;
  strengthTag.className    = "strength-tag " + LABELS[label];
  strengthPct.textContent  = pct + "%";
}

function animateValue(el, target) {
  const n = parseFloat(target);
  if (!isNaN(n) && !target.includes(" ")) {
    let start = null;
    const dur = 550;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = (n * p).toFixed(target.includes(".") ? 2 : 0);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  } else {
    el.textContent = target;
  }
}

function renderResult(data) {
  // Bar
  setBar(data.percentage, data.label);
  strengthWrap.classList.add("show");

  // Common banner
  data.is_common ? show(commonBanner) : hide(commonBanner);

  // Stats
  show(statsRow);
  statLabelCard.className = "stat-card label-" + LABELS[data.label];
  statLabelIcon.textContent = ICONS[data.label];
  statLabelVal.textContent  = data.label;
  animateValue(statCrack, data.crack_time);
  animateValue(statScore,  data.score + " / 15");

  // Advice
  if (data.advice && data.advice.length) {
    adviceList.innerHTML = "";
    data.advice.forEach((tip, i) => {
      const li = document.createElement("li");
      li.textContent = tip;
      li.style.animationDelay = i * 0.07 + "s";
      adviceList.appendChild(li);
    });
    show(adviceBlock);
    hide(allGoodBanner);
  } else {
    hide(adviceBlock);
    show(allGoodBanner);
  }
}

function clearResults() {
  strengthWrap.classList.remove("show");
  hide(commonBanner);
  hide(statsRow);
  hide(adviceBlock);
  hide(allGoodBanner);
}

/* ── Main analyse call ── */
const analyse = debounce(async (pw) => {
  if (!pw) { clearResults(); return; }
  try {
    const res  = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (data.error) { clearResults(); return; }
    renderResult(data);
  } catch (e) {
    console.error(e);
  }
}, 280);

pwInput.addEventListener("input", (e) => analyse(e.target.value));
