const API_BASE = "https://dpuenergy-dpu-tc.hf.space";

// Fetched climate temps (from Open-Meteo). null = use dataset_id from dropdown.
let currentTemps = null;
let currentClimateLabel = null;

// ── Jednotky potřeby tepla ─────────────────────────────────────────────────
const HEAT_TO_GJ = { GJ: 1, MWh: 3.6, kWh: 0.0036 };
let prevHeatUnit = "GJ";

function onHeatUnitChange() {
  const newUnit = document.getElementById("heat_unit").value;
  const factor  = HEAT_TO_GJ[prevHeatUnit] / HEAT_TO_GJ[newUnit];
  const dec     = newUnit === "kWh" ? 0 : 1;
  ["ut_gj", "tuv_gj", "cooling_gj"].forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const newVal = parseFloat(el.value || 0) * factor;
    el.value = newVal.toFixed(dec);
    el.step  = newUnit === "kWh" ? "100" : newUnit === "MWh" ? "0.1" : "1";
  });
  const suffix = newUnit + "/rok";
  const lbls = { lbl_ut_gj: "Roční ÚT", lbl_tuv_gj: "Roční TUV", lbl_cooling_gj: "Roční chlazení" };
  Object.entries(lbls).forEach(function([id, name]) {
    const el = document.getElementById(id);
    if (el) el.textContent = name + " (" + suffix + ")";
  });
  prevHeatUnit = newUnit;
}

function onEerAutoChange() {
  const auto = document.getElementById("eer_auto").checked;
  document.getElementById("eer_manual_row").style.display = auto ? "none" : "block";
}

function onCoolingModeChange() {
  const mode = document.getElementById("cooling_mode").value;
  document.getElementById("cooling_gj_row").style.display  = mode === "gj"   ? "" : "none";
  document.getElementById("cooling_auto_row").style.display = mode === "auto" ? "" : "none";
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}: ${txt}`);
  }
  return await r.json();
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtMwh(x) { return (x == null || isNaN(x)) ? "—" : `${x.toFixed(1)} MWh/rok`; }
function fmtKw(x)  { return (x == null || isNaN(x)) ? "—" : `${x.toFixed(1)} kW`; }
function fmtCop(x) { return (x == null || isNaN(x)) ? "—" : x.toFixed(2); }
function fmtKcz(x) { return (x == null || isNaN(x)) ? "—" : `${Math.round(x).toLocaleString("cs-CZ")} Kč/rok`; }
function fmtMinMax(min, max) {
  if (min == null || max == null || isNaN(min) || isNaN(max)) return "—";
  return `${min.toFixed(1)} / ${max.toFixed(1)} °C`;
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeLineChart(canvasId, labels, data, label) {
  destroyChart(canvasId);
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: "line",
    data: { labels, datasets: [{ label, data, pointRadius: 0, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        decimation: { enabled: true, algorithm: "min-max" },
      },
      scales: { x: { display: false } },
    },
  });
}

function makeBarChart(canvasId, labels, data, label) {
  destroyChart(canvasId);
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: { labels, datasets: [{ label, data }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } },
  });
}

function makeDualAxisDuration(canvasId, x, y1, y2) {
  destroyChart(canvasId);
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    data: {
      labels: x,
      datasets: [
        { type: "line", label: "Výkon (kW) – křivka trvání", data: y1, yAxisID: "y",  pointRadius: 0, borderWidth: 1 },
        { type: "line", label: "COP (–)",                    data: y2, yAxisID: "y1", pointRadius: 0, borderWidth: 1 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        decimation: { enabled: true, algorithm: "min-max" },
      },
      scales: {
        x:  { display: false, title: { display: true, text: "hodiny seřazené od největšího výkonu" } },
        y:  { position: "left",  title: { display: true, text: "kW" } },
        y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "COP" } },
      },
    },
  });
}

// ── Config presets ────────────────────────────────────────────────────────────

const CONFIG_PRESETS = {
  rd: {
    hp_type: "air_water", hp_power_kw: 12, cop_nominal: 3.5, hp_cutoff_c: -15,
    ut_gj: 60, tuv_gj: 15, t_base_c: 20, t_heat_on_c: 14,
    hw_t_design: -15, hw_w_design: 55, hw_t_limit: 14, hw_w_limit: 35,
    investment_kcz: 350000, depr_years: 15, hp_modulation: "inverter",
  },
  bytdom: {
    hp_type: "air_water", hp_power_kw: 100, cop_nominal: 3.2, hp_cutoff_c: -15,
    ut_gj: 600, tuv_gj: 120, t_base_c: 20, t_heat_on_c: 14,
    hw_t_design: -15, hw_w_design: 65, hw_t_limit: 14, hw_w_limit: 45,
    investment_kcz: 2500000, depr_years: 15, hp_modulation: "inverter",
  },
  komercni: {
    hp_type: "water_water", source_temp_c: 10, hp_power_kw: 200, cop_nominal: 4.5, hp_cutoff_c: -30,
    ut_gj: 1500, tuv_gj: 200, t_base_c: 20, t_heat_on_c: 15,
    hw_t_design: -15, hw_w_design: 65, hw_t_limit: 15, hw_w_limit: 50,
    investment_kcz: 6000000, depr_years: 20, hp_modulation: "inverter",
  },
  prumysl: {
    hp_type: "water_water", source_temp_c: 10, hp_power_kw: 500, cop_nominal: 4.2, hp_cutoff_c: -30,
    ut_gj: 4000, tuv_gj: 0, t_base_c: 18, t_heat_on_c: 15,
    hw_t_design: -15, hw_w_design: 75, hw_t_limit: 15, hw_w_limit: 55,
    investment_kcz: 15000000, depr_years: 20, hp_modulation: "on_off",
  },
};

function applyConfigPreset() {
  const key = document.getElementById("config_preset")?.value;
  if (!key || !CONFIG_PRESETS[key]) return;
  const p = CONFIG_PRESETS[key];

  const fields = ["hp_power_kw", "cop_nominal", "hp_cutoff_c", "ut_gj", "tuv_gj",
    "t_base_c", "t_heat_on_c", "investment_kcz", "depr_years", "source_temp_c", "hp_modulation",
    "hw_t_design", "hw_w_design", "hw_t_limit", "hw_w_limit"];
  for (const f of fields) {
    if (p[f] !== undefined) {
      const el = document.getElementById(f);
      if (el) { el.value = p[f]; el._userEdited = false; }
    }
  }
  if (p.hp_type) {
    const el = document.getElementById("hp_type");
    if (el) { el.value = p.hp_type; onHpTypeChange(); }
  }
  // Reset hw_preset selector to "Vlastní" since custom values were set
  const hwSel = document.getElementById("hw_preset");
  if (hwSel) hwSel.value = "";
  calcHeatingCurve();
  onModulationChange();
  calcAccumulation();
  simulate();
}

// ── HP type ───────────────────────────────────────────────────────────────────

const HP_TYPE_CONFIG = {
  air_water:   { label: "A7/W45", cutoff: -15, cop: 3.2, showSource: false },
  water_water: { label: "W10/W45", cutoff: -30, cop: 4.5, showSource: true,  sourceDefault: 10, sourceHint: "Pro podzemní vodu typicky 8–12 °C (celoroční průměr vrtu)." },
  ground_water:{ label: "B0/W45",  cutoff: -30, cop: 4.0, showSource: true,  sourceDefault: 2,  sourceHint: "Pro geotermální sondy typicky 0–5 °C (závisí na hloubce a lokalitě)." },
};

function onHpTypeChange() {
  const type   = document.getElementById("hp_type")?.value || "air_water";
  const cfg    = HP_TYPE_CONFIG[type] || HP_TYPE_CONFIG.air_water;
  const srcRow = document.getElementById("source_temp_row");
  const srcEl  = document.getElementById("source_temp_c");
  const hintEl = document.getElementById("source_temp_hint");
  const lblEl  = document.getElementById("hp_power_label");
  const cutEl  = document.getElementById("hp_cutoff_c");
  const copEl  = document.getElementById("cop_nominal");

  if (srcRow) srcRow.style.display = cfg.showSource ? "" : "none";
  if (hintEl && cfg.sourceHint) hintEl.textContent = cfg.sourceHint;
  if (srcEl  && cfg.showSource && !srcEl._userEdited) srcEl.value = cfg.sourceDefault;
  if (lblEl) lblEl.textContent = `Výkon TČ při ${cfg.label} (kW)`;
  if (cutEl) cutEl.value = cfg.cutoff;
  if (copEl && !copEl._userEdited) copEl.value = cfg.cop;

  calcAccumulation();
}

// ── Modulation (inverter / on-off) ────────────────────────────────────────────

function onModulationChange() {
  const mod = document.getElementById("hp_modulation")?.value || "inverter";
  const minLoadRow    = document.getElementById("min_load_row");
  const cyclingRow    = document.getElementById("cycling_loss_row");
  if (minLoadRow)  minLoadRow.style.display  = mod === "inverter" ? "" : "none";
  if (cyclingRow)  cyclingRow.style.display  = mod === "on_off"   ? "" : "none";
}

// ── Custom performance table ──────────────────────────────────────────────────

let customPerfTable = null;

function parseCustomTable() {
  const csv = document.getElementById("custom_perf_csv")?.value || "";
  const rows = csv.trim().split(/[\r\n]+/).filter(l => l.trim());
  const table = [];
  for (const row of rows) {
    const cols = row.split(/[,;\t]/).map(c => parseFloat(c.trim().replace(",", ".")));
    if (cols.length < 4 || cols.some(isNaN)) {
      document.getElementById("custom_perf_status").textContent = `Chyba na řádku: ${row}`;
      return;
    }
    table.push(cols);
  }
  if (table.length < 2) {
    document.getElementById("custom_perf_status").textContent = "Minimálně 2 body jsou potřeba.";
    return;
  }
  customPerfTable = table;
  document.getElementById("custom_perf_status").textContent = `✓ ${table.length} bodů načteno. Tabulka aktivní.`;
}

function clearCustomTable() {
  customPerfTable = null;
  const statusEl = document.getElementById("custom_perf_status");
  if (statusEl) statusEl.textContent = "Vlastní tabulka zrušena — používá se vestavěná.";
}

async function ocrPerfTable(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById("custom_perf_status");
  statusEl.textContent = "Odesílám obrázek Claudovi…";
  const formData = new FormData();
  formData.append("file", file);
  try {
    const r = await fetch(`${API_BASE}/api/parse-perf-table`, { method: "POST", body: formData });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      statusEl.textContent = `Chyba: ${err.detail || r.statusText}`;
      return;
    }
    const { perf_table, count } = await r.json();
    // Fill the textarea as CSV for user review
    const csv = perf_table.map(row => row.join(",")).join("\n");
    document.getElementById("custom_perf_csv").value = csv;
    statusEl.textContent = `OCR: ${count} bodů extrahováno. Zkontroluj a klikni "Ověřit a použít".`;
  } catch (e) {
    statusEl.textContent = `Chyba sítě: ${e.message}`;
  }
  // Reset file input so the same file can be re-uploaded
  input.value = "";
}

// ── Custom heat demand profile (CSV) ─────────────────────────────────────────

let customDemandKwh = null;

function loadCustomDemand(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split(/[\r\n]+/).filter(l => l.trim() !== "");
    const vals  = lines.map(l => parseFloat(l.trim().replace(",", ".")));
    const statusEl = document.getElementById("custom_demand_status");
    if (vals.some(isNaN)) {
      if (statusEl) statusEl.textContent = "Chyba: soubor obsahuje nečíselné hodnoty.";
      customDemandKwh = null;
      return;
    }
    customDemandKwh = vals;
    const total = vals.reduce((a, b) => a + b, 0);
    if (statusEl) statusEl.textContent = `✓ Načteno ${vals.length} hodin, celkem ${(total / 1000).toFixed(1)} MWh/rok`;
  };
  reader.readAsText(file);
}

// ── Reversible HP (cooling) ───────────────────────────────────────────────────

function toggleCooling() {
  const enabled = document.getElementById("cooling_enabled")?.checked;
  const params  = document.getElementById("cooling_params");
  if (params) params.style.display = enabled ? "" : "none";
}

// ── NPV / IRR ─────────────────────────────────────────────────────────────────

let _lastSavingsKcz    = null;
let _lastInvestmentKcz = null;

function calcNPV() {
  const savings = _lastSavingsKcz;
  const invest  = _lastInvestmentKcz ?? parseFloat(document.getElementById("investment_kcz")?.value || 0);
  const r       = parseFloat(document.getElementById("discount_rate")?.value || 5) / 100;
  const years   = parseInt(document.getElementById("npv_years")?.value || 20);
  const el      = document.getElementById("npv_result");
  const elInline = document.getElementById("npv_result_inline");
  if (!el && !elInline) return;

  if (!savings || savings <= 0) {
    const msg = '<div class="hint">Spusťte simulaci pro výpočet úspory.</div>';
    if (el) el.innerHTML = msg;
    if (elInline) elInline.innerHTML = msg;
    return;
  }

  // Show annual savings even without investment
  const savEl = document.getElementById("savings_inline");
  if (savEl) savEl.textContent = `Roční úspora oproti původnímu zdroji: ${Math.round(savings).toLocaleString("cs-CZ")} Kč/rok`;

  if (!invest || invest <= 0) {
    const msg = `<div class="hint">Roční úspora: <strong>${Math.round(savings).toLocaleString("cs-CZ")} Kč/rok</strong>. Zadejte investici pro NPV / IRR.</div>`;
    if (el) el.innerHTML = msg;
    if (elInline) elInline.innerHTML = "";
    return;
  }

  const payback = invest / savings;

  let npv = -invest;
  for (let t = 1; t <= years; t++) npv += savings / Math.pow(1 + r, t);

  // IRR: binary search
  let irr = null;
  let lo = 0, hi = 2;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    let npvMid = -invest;
    for (let t = 1; t <= years; t++) npvMid += savings / Math.pow(1 + mid, t);
    if (npvMid > 0) lo = mid; else hi = mid;
  }
  irr = (lo + hi) / 2;
  if (irr >= 1.99 || irr < 0) irr = null;

  const fmt = v => Math.round(v).toLocaleString("cs-CZ");
  const npvCls = npv >= 0 ? "box-good" : "box-bad";
  const html = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
      <div class="box" style="text-align:center;">
        <div class="box-label">Prostá návratnost</div>
        <div class="box-val">${payback.toFixed(1)} let</div>
      </div>
      <div class="box ${npvCls}" style="text-align:center;">
        <div class="box-label">NPV (${years} let, ${(r * 100).toFixed(1)} %)</div>
        <div class="box-val">${fmt(npv)} Kč</div>
      </div>
      <div class="box" style="text-align:center;">
        <div class="box-label">IRR</div>
        <div class="box-val">${irr != null ? (irr * 100).toFixed(1) + " %" : "—"}</div>
      </div>
    </div>`;
  if (el) el.innerHTML = html;
  if (elInline) elInline.innerHTML = html;
}

// ── Accumulation tank sizing ──────────────────────────────────────────────────

function calcAccumulation() {
  const powerKw = parseFloat(document.getElementById("hp_power_kw")?.value || 0);
  const tMin    = parseFloat(document.getElementById("acc_t_min")?.value   || 5);
  const dt      = parseFloat(document.getElementById("acc_dt")?.value      || 5);
  const el      = document.getElementById("acc_result");
  if (!el) return;
  if (!powerKw || !tMin || !dt || dt <= 0) { el.textContent = "—"; return; }

  const vol     = (powerKw * tMin * 60) / (4.182 * dt);
  const rounded = Math.ceil(vol / 50) * 50;
  el.innerHTML  = `${Math.round(vol).toLocaleString("cs-CZ")} l → typická řada zásobníku: <strong>${rounded} l</strong>`;
}

// ── Heating curve ─────────────────────────────────────────────────────────────

const HEATING_CURVE_PRESETS = {
  podlaha:  { t1: -15, w1: 40, t2: 20, w2: 25 },
  nizko:    { t1: -15, w1: 55, t2: 14, w2: 35 },
  standard: { t1: -15, w1: 65, t2: 14, w2: 45 },
  vysoko:   { t1: -15, w1: 75, t2: 14, w2: 55 },
};

function applyHwPreset() {
  const key = document.getElementById("hw_preset")?.value;
  if (!key || !HEATING_CURVE_PRESETS[key]) { calcHeatingCurve(); return; }
  const p = HEATING_CURVE_PRESETS[key];
  document.getElementById("hw_t_design").value = p.t1;
  document.getElementById("hw_w_design").value = p.w1;
  document.getElementById("hw_t_limit").value  = p.t2;
  document.getElementById("hw_w_limit").value  = p.w2;
  calcHeatingCurve();
}

function calcHeatingCurve() {
  const t1 = parseFloat(document.getElementById("hw_t_design")?.value);
  const w1 = parseFloat(document.getElementById("hw_w_design")?.value);
  const t2 = parseFloat(document.getElementById("hw_t_limit")?.value);
  const w2 = parseFloat(document.getElementById("hw_w_limit")?.value);
  const resultEl = document.getElementById("hw_calc_result");

  if ([t1, w1, t2, w2].some(isNaN)) { if (resultEl) resultEl.textContent = ""; return; }
  if (t1 >= t2) {
    if (resultEl) resultEl.textContent = "⚠ Návrhová T_venku musí být nižší než mez topení.";
    return;
  }
  const slope     = (w1 - w2) / (t1 - t2);
  const intercept = w1 - slope * t1;
  const min_c     = w2;

  document.getElementById("hw_slope").value     = slope.toFixed(4);
  document.getElementById("hw_intercept").value = intercept.toFixed(2);
  document.getElementById("hw_min_c").value     = min_c.toFixed(1);

  if (resultEl) resultEl.textContent =
    `→ Sklon: ${slope.toFixed(3)} °C/°C · intercept: ${intercept.toFixed(1)} °C · min T vody: ${min_c} °C`;
}

// ── Bivalence & baseline source type ──────────────────────────────────────────

function calcGasPrice(which) {
  const isB = which === "biv";
  const priceEl = document.getElementById(isB ? "gas_price_kcz_per_m3" : "base_gas_price_kcz_per_m3");
  const kwhEl   = document.getElementById(isB ? "gas_kwh_per_m3"       : "base_gas_kwh_per_m3");
  const effEl   = document.getElementById(isB ? "bivalence_efficiency"  : "base_efficiency");
  const outEl   = document.getElementById(isB ? "biv_gas_eff"           : "base_gas_eff");
  if (!outEl) return;
  const price = parseFloat(priceEl?.value || 0);
  const kwh   = parseFloat(kwhEl?.value   || 10.5);
  const eff   = parseFloat(effEl?.value   || 0.92);
  if (!price || !kwh || !eff) { outEl.textContent = ""; return; }
  const effPrice = price / (kwh * eff);
  outEl.textContent = `→ Efektivní cena tepla: ${effPrice.toFixed(2)} Kč/kWh`;
}

function onBivalenceTypeChange() {
  const type = document.getElementById("bivalence_type")?.value || "gas_boiler";
  const isGas = type === "gas_boiler";
  const gasFields = document.getElementById("biv_gas_fields");
  const elField   = document.getElementById("biv_el_field");
  if (gasFields) gasFields.style.display = isGas ? "" : "none";
  if (elField)   elField.style.display   = isGas ? "none" : "";
  if (isGas) calcGasPrice("biv");
}

function onBaseSourceTypeChange() {
  const type = document.getElementById("base_source_type")?.value || "gas_boiler";
  const isGas = type === "gas_boiler";
  const gasFields = document.getElementById("base_gas_fields");
  const elField   = document.getElementById("base_el_field");
  if (gasFields) gasFields.style.display = isGas ? "" : "none";
  if (elField)   elField.style.display   = isGas ? "none" : "";
  if (isGas) calcGasPrice("base");
}

// ── Climate ───────────────────────────────────────────────────────────────────

function onClimateSourceChange() {
  const src = document.getElementById("climate_source")?.value || "openmeteo";
  document.getElementById("panel_openmeteo").style.display = src === "openmeteo" ? "" : "none";
  document.getElementById("panel_pvgis").style.display     = src === "pvgis"     ? "" : "none";
  document.getElementById("panel_chmi").style.display      = src === "chmi"      ? "" : "none";
  if (src === "chmi") {
    const sel = document.getElementById("chmi_station");
    if (sel && sel.options.length <= 1) loadChmiStations();
  }
}

function populateYearSelect() {
  const lastFull = new Date().getFullYear() - 1;
  // Open-Meteo year select
  const sel = document.getElementById("climate_year");
  if (sel) {
    for (let y = lastFull; y >= 2010; y--) {
      const opt = document.createElement("option");
      opt.value = y; opt.textContent = y;
      if (y === lastFull) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  // CHMI year select
  const selC = document.getElementById("chmi_year");
  if (selC) {
    for (let y = lastFull; y >= 2010; y--) {
      const opt = document.createElement("option");
      opt.value = y; opt.textContent = y;
      if (y === lastFull) opt.selected = true;
      selC.appendChild(opt);
    }
  }
}

function applyCityPreset() {
  const val = document.getElementById("city_preset")?.value;
  if (!val) return;
  const [lat, lon] = val.split(",").map(Number);
  const latEl = document.getElementById("climate_lat");
  const lonEl = document.getElementById("climate_lon");
  if (latEl) latEl.value = lat;
  if (lonEl) lonEl.value = lon;
}

function applyPvgisPreset() {
  const val = document.getElementById("city_preset_pvgis")?.value;
  if (!val) return;
  const [lat, lon] = val.split(",").map(Number);
  const latEl = document.getElementById("pvgis_lat");
  const lonEl = document.getElementById("pvgis_lon");
  if (latEl) latEl.value = lat;
  if (lonEl) lonEl.value = lon;
}

function _setClimateStatus(msg, ok = true) {
  const el = document.getElementById("climateStatus");
  if (!el) return;
  el.textContent = (ok ? "✓ Načteno: " : "⚠ ") + msg;
  el.style.color = ok ? "#1b7a4a" : "#e07b00";
}

async function fetchClimate() {
  const btn = document.getElementById("btnFetchClimate");
  const statusEl = document.getElementById("climateStatus");
  btn.disabled = true;
  btn.textContent = "Načítám…";
  try {
    const lat  = parseFloat(document.getElementById("climate_lat").value);
    const lon  = parseFloat(document.getElementById("climate_lon").value);
    const year = parseInt(document.getElementById("climate_year").value);
    const presetSel = document.getElementById("city_preset");
    const cityName = (presetSel?.selectedIndex > 0)
      ? presetSel.options[presetSel.selectedIndex].text
      : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    const res = await apiGet(`/api/fetch-climate?lat=${lat}&lon=${lon}&year=${year}`);
    currentTemps = res.temps_c;
    currentClimateLabel = `${cityName} ${year} (${res.count} h, T min ${res.t_min}°C / max ${res.t_max}°C)`;
    _setClimateStatus(currentClimateLabel);
    await simulate();
  } catch (e) {
    alert("Chyba při načítání klimadat:\n" + (e?.message || e));
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "Načíst z Open-Meteo";
  }
}

async function fetchPvgisTmy() {
  const statusEl = document.getElementById("climateStatus");
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = "Načítám…"; }
  try {
    const lat = parseFloat(document.getElementById("pvgis_lat").value);
    const lon = parseFloat(document.getElementById("pvgis_lon").value);
    const presetSel = document.getElementById("city_preset_pvgis");
    const cityName = (presetSel?.selectedIndex > 0)
      ? presetSel.options[presetSel.selectedIndex].text
      : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    const res = await apiGet(`/api/fetch-pvgis-tmy?lat=${lat}&lon=${lon}`);
    currentTemps = res.temps_c;
    currentClimateLabel = `${cityName} TMY (${res.count} h, T min ${res.t_min}°C / max ${res.t_max}°C)`;
    _setClimateStatus(currentClimateLabel);
    await simulate();
  } catch (e) {
    alert("Chyba při načítání PVGIS TMY:\n" + (e?.message || e));
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Načíst TMY z PVGIS"; }
  }
}

function onChmiSelectionChange() {
  const hint = document.getElementById("chmi_reload_hint");
  if (hint) hint.style.display = "";
}

async function loadChmiStations() {
  const sel = document.getElementById("chmi_station");
  const btn = event?.target?.tagName === "BUTTON" ? event.target : null;
  if (btn) { btn.disabled = true; btn.textContent = "Načítám…"; }
  try {
    const r = await fetch(window.location.origin + "/tc/api/chmi-stations");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const res = await r.json();
    sel.innerHTML = '<option value="">-- vybrat stanici --</option>';
    for (const s of res.stations) {
      const opt = document.createElement("option");
      opt.value = s.wsi;
      opt.dataset.lat = s.lat;
      opt.dataset.lon = s.lon;
      opt.textContent = `${s.name} (${s.lat.toFixed(3)}, ${s.lon.toFixed(3)})`;
      sel.appendChild(opt);
    }
  } catch (e) {
    alert("Chyba při načítání stanic ČHMÚ:\n" + (e?.message || e));
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Načíst stanice"; }
  }
}

async function fetchChmiData() {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = "Načítám…"; }
  try {
    const stationSel = document.getElementById("chmi_station");
    const year = parseInt(document.getElementById("chmi_year").value);
    const opt  = stationSel.options[stationSel.selectedIndex];
    if (!opt?.value) { alert("Nejprve vyber stanici."); return; }

    const stationName = opt.text.split(" (")[0];
    const lat = opt.dataset.lat;
    const lon = opt.dataset.lon;
    if (!lat || !lon) { alert("Stanice nemá souřadnice – zkus znovu načíst seznam."); return; }

    const r = await fetch(
      `${window.location.origin}/tc/api/fetch-chmi?lat=${lat}&lon=${lon}&year=${year}`
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const res = await r.json();
    currentTemps = res.temps_c;
    currentClimateLabel = `ČHMÚ ${stationName} ${year} (${res.count} h, T min ${res.t_min}°C / max ${res.t_max}°C)`;
    _setClimateStatus(currentClimateLabel);
    const hint = document.getElementById("chmi_reload_hint");
    if (hint) hint.style.display = "none";
    await simulate();
  } catch (e) {
    alert("Chyba při načítání dat ČHMÚ:\n" + (e?.message || e));
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Načíst data z ČHMÚ"; }
  }
}

// ── Inputs ────────────────────────────────────────────────────────────────────

function getInputs() {
  const hpType      = document.getElementById("hp_type")?.value || "air_water";
  const coolingMode = document.getElementById("cooling_mode")?.value || "gj";
  const heatUnit    = document.getElementById("heat_unit")?.value || "GJ";
  const heatToGj    = HEAT_TO_GJ[heatUnit] || 1;
  const inp = {
    dataset_id: document.getElementById("dataset")?.value || "",
    hp_type: hpType,
    hp_modulation:      document.getElementById("hp_modulation")?.value || "inverter",
    hp_min_load_pct:    parseFloat(document.getElementById("hp_min_load_pct")?.value || 25),
    hp_cycling_loss_pct: parseFloat(document.getElementById("hp_cycling_loss_pct")?.value || 5),

    tuv_profile:   document.getElementById("tuv_profile")?.value || "uniform",
    tuv_min_temp_c: parseFloat(document.getElementById("tuv_min_temp_c")?.value || 55),

    tuv_tank_liters:  parseFloat(document.getElementById("tuv_tank_liters")?.value  || 300),
    tuv_tank_t_max:   parseFloat(document.getElementById("tuv_tank_t_max")?.value   || 65),
    cool_tank_liters: parseFloat(document.getElementById("cool_tank_liters")?.value || 500),
    cool_tank_t_min:  parseFloat(document.getElementById("cool_tank_t_min")?.value  || 6),
    cool_tank_t_max:  parseFloat(document.getElementById("cool_tank_t_max")?.value  || 14),

    cooling_enabled:      document.getElementById("cooling_enabled")?.checked || false,
    cooling_mode:         coolingMode,
    cooling_gj:           coolingMode === "gj" ? parseFloat(document.getElementById("cooling_gj")?.value || 0) * heatToGj : 0,
    cooling_power_kw:     coolingMode === "auto" ? parseFloat(document.getElementById("cooling_power_kw")?.value || 0) : 0,
    cooling_t_design_c:   coolingMode === "auto" ? parseFloat(document.getElementById("cooling_t_design_c")?.value || 32) : 32,
    cooling_threshold_c:  parseFloat(document.getElementById("cooling_threshold_c")?.value || 18),
    eer_cooling:          document.getElementById("eer_auto")?.checked ? 0 : parseFloat(document.getElementById("eer_cooling")?.value || 2.2),

    ut_gj:  parseFloat(document.getElementById("ut_gj").value  || "0") * heatToGj,
    tuv_gj: parseFloat(document.getElementById("tuv_gj").value || "0") * heatToGj,

    hp_power_kw:   parseFloat(document.getElementById("hp_power_kw").value   || "0"),
    hp_cutoff_c:   parseFloat(document.getElementById("hp_cutoff_c").value   || "-15"),
    cop_nominal:   parseFloat(document.getElementById("cop_nominal")?.value   || "3.2"),
    hw_slope:      parseFloat(document.getElementById("hw_slope")?.value      || "-1.25"),
    hw_intercept:  parseFloat(document.getElementById("hw_intercept")?.value  || "42.5"),
    hw_min_c:      parseFloat(document.getElementById("hw_min_c")?.value      || "45"),
    t_base_c:      parseFloat(document.getElementById("t_base_c")?.value      || "20"),
    t_heat_on_c:   parseFloat(document.getElementById("t_heat_on_c")?.value   || "14"),

    customer_type:        document.getElementById("customer_type")?.value        || "household",
    electricity_tariff:   document.getElementById("electricity_tariff")?.value   || "",
    supplier_key:         document.getElementById("supplier_key")?.value         || "cez",
    price_kcz_per_mwh:    parseFloat(document.getElementById("price_kcz_per_mwh").value || "2500"),

    bivalence_type:              document.getElementById("bivalence_type")?.value              || "gas_boiler",
    bivalence_efficiency:        parseFloat(document.getElementById("bivalence_efficiency").value        || "0.92"),
    gas_price_kcz_per_m3:        parseFloat(document.getElementById("gas_price_kcz_per_m3").value        || "25"),
    gas_kwh_per_m3:              parseFloat(document.getElementById("gas_kwh_per_m3").value              || "10.5"),
    bivalence_price_kcz_per_kwh: parseFloat(document.getElementById("bivalence_price_kcz_per_kwh").value || "4.0"),

    base_source_type:         document.getElementById("base_source_type")?.value         || "gas_boiler",
    base_efficiency:          parseFloat(document.getElementById("base_efficiency").value          || "0.90"),
    base_gas_price_kcz_per_m3: parseFloat(document.getElementById("base_gas_price_kcz_per_m3").value || "25"),
    base_gas_kwh_per_m3:       parseFloat(document.getElementById("base_gas_kwh_per_m3").value       || "10.5"),
    base_price_kcz_per_kwh:    parseFloat(document.getElementById("base_price_kcz_per_kwh").value    || "4.0"),

    include_depreciation: document.getElementById("include_depr").checked,
    investment_kcz:       parseFloat(document.getElementById("investment_kcz").value || "0"),
    depr_years:           parseFloat(document.getElementById("depr_years").value     || "15"),
  };

  // For non-air-source HP types, pass constant source temperature to backend
  if (hpType !== "air_water") {
    const srcTemp = parseFloat(document.getElementById("source_temp_c")?.value);
    if (!isNaN(srcTemp)) inp.source_temp_c = srcTemp;
  }

  // Custom performance table
  if (customPerfTable && customPerfTable.length >= 2) {
    inp.custom_perf_table = customPerfTable;
  }

  // Custom heat demand profile
  if (customDemandKwh && customDemandKwh.length >= 100) {
    inp.heat_demand_kwh = customDemandKwh;
  }

  // Pass fetched climate temps directly – backend skips dataset_id lookup when present
  if (currentTemps && currentTemps.length >= 100) {
    inp.temps_c = currentTemps;
  }

  return inp;
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function _boxClass(el, cls) {
  if (!el) return;
  el.classList.remove("box-good", "box-warn", "box-bad");
  if (cls) el.classList.add(cls);
}

function updateKpis(summary) {
  _lastSavingsKcz    = summary.savings_kcz    || null;
  _lastInvestmentKcz = parseFloat(document.getElementById("investment_kcz")?.value || 0) || null;

  // Color-code KPI boxes
  const cop = summary.avg_cop || 0;
  _boxClass(document.getElementById("box_el"),
    cop >= 3.5 ? "box-good" : cop >= 2.5 ? null : "box-bad");

  const hpShare = summary.heat_from_hp_mwh / Math.max(0.01, summary.heat_from_hp_mwh + summary.bivalence_mwh);
  _boxClass(document.getElementById("box_heat"),
    hpShare >= 0.9 ? "box-good" : hpShare >= 0.7 ? null : "box-warn");

  _boxClass(document.getElementById("box_tout"), null);
  _boxClass(document.getElementById("box_peak"), null);

  document.getElementById("kpi_el").textContent   = fmtMwh(summary.electricity_mwh);
  const bivalStr = summary.bivalent_point_c != null
    ? `${summary.bivalent_point_c.toFixed(1)} °C`
    : "—";
  const coolingEnabledKpi = document.getElementById("cooling_enabled")?.checked;
  const copStr = coolingEnabledKpi
    ? `SCOP topení: ${fmtCop(summary.avg_cop_heating)} | EER chlazení: ${fmtCop(summary.avg_cop_cooling)} | celkové: ${fmtCop(summary.avg_cop_total)} | bival. bod: ${bivalStr}`
    : `SCOP: ${fmtCop(summary.avg_cop)} | bival. bod: ${bivalStr}`;
  document.getElementById("kpi_cop").textContent = copStr;

  document.getElementById("kpi_hp_heat").textContent = fmtMwh(summary.heat_from_hp_mwh);
  document.getElementById("kpi_biv").textContent      = `bivalence: ${fmtMwh(summary.bivalence_mwh)}`;

  document.getElementById("kpi_peak").textContent  = fmtKw(summary.heat_need_peak_kw);
  document.getElementById("kpi_peak2").textContent = `TČ max / bivalence max: ${fmtKw(summary.hp_power_peak_kw)} / ${fmtKw(summary.bivalence_peak_kw)}`;

  document.getElementById("kpi_tout").textContent  = summary.t_out_avg_c != null ? `${summary.t_out_avg_c.toFixed(1)} °C` : "—";
  document.getElementById("kpi_tout2").textContent = `min / max: ${fmtMinMax(summary.t_out_min_c, summary.t_out_max_c)}`;

  // Cooling KPI — show whenever cooling is enabled
  const coolingEnabled = document.getElementById("cooling_enabled")?.checked;
  const boxCooling = document.getElementById("box_cooling");
  if (boxCooling) boxCooling.style.display = coolingEnabled ? "" : "none";
  if (coolingEnabled) {
    const cov = summary.cooling_coverage_pct ?? 100;
    const covStr = cov < 99.5
      ? ` ⚠ pokryto ${cov.toFixed(0)} % poptávky (${fmtMwh(summary.cooling_demand_mwh)})`
      : "";
    document.getElementById("kpi_cooling").textContent  = fmtMwh(summary.cooling_mwh) + covStr;
    document.getElementById("kpi_cooling2").textContent = `EER: ${fmtCop(summary.avg_cop_cooling)} | špička: ${fmtKw(summary.cooling_peak_kw)}`;
  }

  document.getElementById("kpi_cost").textContent =
    `Elektřina (${summary.electricity_tariff || "tarif"} / ${summary.supplier_key || "dodavatel"}): ${fmtKcz(summary.electricity_cost_kcz)}`;
  document.getElementById("kpi_cost2").textContent =
    `Bivalence: ${fmtKcz(summary.bivalence_cost_kcz)} | Odpisy: ${fmtKcz(summary.depr_cost_kcz)} | Celkem: ${fmtKcz(summary.total_cost_kcz)} | Před: ${fmtKcz(summary.baseline_cost_kcz)} | Úspora: ${fmtKcz(summary.savings_kcz)}`;

  calcNPV();
}

// ── Charts ────────────────────────────────────────────────────────────────────

function buildCharts(result) {
  const s       = result.series;
  const summary = result.summary;
  const labels  = s.t_out_c.map((_, i) => i);

  makeLineChart("chTout", labels, s.t_out_c, "T venku (°C)");

  destroyChart("chPower");
  charts["chPower"] = new Chart(document.getElementById("chPower"), {
    data: {
      labels,
      datasets: [
        { type: "line", label: "Potřeba tepla (kW)", data: s.heat_need_kw, pointRadius: 0, borderWidth: 1 },
        { type: "line", label: "Výkon TČ (kW)",      data: s.hp_heat_kw,  pointRadius: 0, borderWidth: 1 },
        { type: "line", label: "Bivalence (kW)",      data: s.bivalence_kw, pointRadius: 0, borderWidth: 1 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true }, decimation: { enabled: true, algorithm: "min-max" } },
      scales: { x: { display: false } },
    },
  });

  const coolingActive = document.getElementById("cooling_enabled")?.checked;
  if (coolingActive && summary.cooling_mwh != null) {
    makeBarChart("chHeatSplit",
      ["TČ", "Bivalence", "Chlazení"],
      [summary.heat_from_hp_mwh, summary.bivalence_mwh, summary.cooling_mwh],
      "Energie (MWh/rok)"
    );
  } else {
    makeBarChart("chHeatSplit",
      ["TČ", "Bivalence"],
      [summary.heat_from_hp_mwh, summary.bivalence_mwh],
      "Vyrobené teplo (MWh/rok)"
    );
  }

  // Duration curve: sort heating hours only (exclude summer zero-demand hours)
  const idx     = s.heat_need_kw.map((v, i) => ({ v, i }))
                    .filter(o => o.v > 0.1)
                    .sort((a, b) => b.v - a.v)
                    .map(o => o.i);
  const durLabels = idx.map((_, i) => i);
  const dur_kw  = idx.map(i => s.heat_need_kw[i]);
  // Rolling average COP (window 30) to remove noise
  const dur_cop_raw = idx.map(i => s.cop[i] || null);
  const W = 30;
  const dur_cop = dur_cop_raw.map((_, j) => {
    const slice = dur_cop_raw.slice(Math.max(0, j - W), j + W + 1).filter(v => v != null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
  makeDualAxisDuration("chDurationCop", durLabels, dur_kw, dur_cop);

  // Cooling chart — shown when cooling is enabled; graph rendered only if series data present
  const coolingWrap = document.getElementById("ch_cooling_wrap");
  if (coolingWrap) coolingWrap.style.display = coolingActive ? "" : "none";
  if (coolingActive && s.cooling_kw) {
    makeLineChart("chCooling", labels, s.cooling_kw, "Výkon chlazení (kW)");
  } else {
    destroyChart("chCooling");
  }

  // Tank SOC chart — only meaningful when cooling is active (tanks vary with heat recovery)
  const tankWrap = document.getElementById("ch_tank_soc_wrap");
  if (tankWrap) tankWrap.style.display = coolingActive ? "" : "none";
  if (coolingActive) {
    destroyChart("chTankSoc");
    const datasets = [];
    if (s.tuv_soc)  datasets.push({ label: "TUV zásobník (%)",      data: s.tuv_soc.map(v => v * 100),  pointRadius: 0, borderWidth: 1 });
    if (s.cool_soc) datasets.push({ label: "Chlazený zásobník (%)", data: s.cool_soc.map(v => v * 100), pointRadius: 0, borderWidth: 1 });
    charts["chTankSoc"] = new Chart(document.getElementById("chTankSoc"), {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true }, decimation: { enabled: true, algorithm: "min-max" } },
        scales: { x: { display: false }, y: { min: 0, max: 100, title: { display: true, text: "% kapacity" } } },
      },
    });
  } else {
    destroyChart("chTankSoc");
  }

  // Heating curve: theoretical design curve from parameters (not simulated data)
  const hcSlope     = parseFloat(document.getElementById("hw_slope")?.value     || -1.25);
  const hcIntercept = parseFloat(document.getElementById("hw_intercept")?.value || 42.5);
  const hcMin       = parseFloat(document.getElementById("hw_min_c")?.value     || 45);
  const hcTLimit    = parseFloat(document.getElementById("hw_t_limit")?.value   || 14);
  const hcTDesign   = parseFloat(document.getElementById("hw_t_design")?.value  || -15);
  const hcPts = [];
  for (let t = Math.floor(hcTDesign) - 2; t <= hcTLimit; t += 0.5) {
    hcPts.push({ x: t, y: Math.max(hcMin, hcSlope * t + hcIntercept) });
  }
  destroyChart("chHeatingCurve");
  charts["chHeatingCurve"] = new Chart(document.getElementById("chHeatingCurve"), {
    type: "line",
    data: { datasets: [{ label: "T voda (°C)", data: hcPts, pointRadius: 0, borderWidth: 2, tension: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      parsing: { xAxisKey: "x", yAxisKey: "y" },
      scales: {
        x: { type: "linear", title: { display: true, text: "T venku (°C)" } },
        y: { title: { display: true, text: "T výstupní vody (°C)" } },
      },
    },
  });
}

// ── Main actions ──────────────────────────────────────────────────────────────


async function simulate() {
  const btn = document.getElementById("btnSim");
  btn.disabled  = true;
  btn.textContent = "Počítám…";
  try {
    const res = await apiPost("/api/simulate", getInputs());
    updateKpis(res.summary);
    buildCharts(res);
  } catch (e) {
    alert("Chyba simulace:\n" + (e?.message || e));
    console.error(e);
  } finally {
    btn.disabled  = false;
    btn.textContent = "Simulovat";
  }
}

async function optimize() {
  const btn = document.getElementById("btnOpt");
  btn.disabled  = true;
  btn.textContent = "Počítám…";
  try {
    const inp = getInputs();
    inp.min_kw          = parseFloat(document.getElementById("opt_min").value          || "20");
    inp.max_kw          = parseFloat(document.getElementById("opt_max").value          || "300");
    inp.step_kw         = parseFloat(document.getElementById("opt_step").value         || "5");
    inp.invest_base_kcz  = parseFloat(document.getElementById("invest_base_kcz")?.value  || "0");
    inp.invest_per_kw_kcz = parseFloat(document.getElementById("invest_per_kw_kcz")?.value || "0");

    const res = await apiPost("/api/optimize", inp);

    // Build optimize chart (cost curve + optional investment curve)
    const hasInvest = res.investment_kcz?.some(v => v > 0);
    const datasets = [
      {
        label: "Celkové roční náklady (Kč/rok)",
        data: res.total_cost_kcz,
        pointRadius: 0, borderWidth: 2, yAxisID: "y",
      },
    ];
    if (hasInvest) {
      datasets.push({
        label: "Celková investice (Kč)",
        data: res.investment_kcz,
        pointRadius: 0, borderWidth: 1, borderDash: [6, 3], yAxisID: "y1",
      });
    }

    // Swap placeholder → canvas (canvas was always in DOM, so layout is already computed)
    const placeholder = document.getElementById("opt_placeholder");
    const canvasWrap  = document.getElementById("opt_canvas_wrap");
    if (placeholder) placeholder.style.display = "none";
    if (canvasWrap)  canvasWrap.style.display  = "";

    destroyChart("chOpt");
    charts["chOpt"] = new Chart(document.getElementById("chOpt"), {
      type: "line",
      data: { labels: res.hp_power_kw, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          x:  { title: { display: true, text: "Výkon TČ (kW)" } },
          y:  { position: "left",  title: { display: true, text: "Roční náklady (Kč/rok)" } },
          ...(hasInvest ? {
            y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Investice (Kč)" } },
          } : {}),
        },
      },
    });

    if (res.best) {
      document.getElementById("hp_power_kw").value = res.best.hp_power_kw;
      const investInfo = res.best.investment_kcz > 0
        ? ` · Investice: ${Math.round(res.best.investment_kcz).toLocaleString("cs-CZ")} Kč`
        : "";
      const infoEl = document.getElementById("opt_best_info");
      if (infoEl) infoEl.textContent = `✓ Optimum: ${res.best.hp_power_kw} kW · Náklady: ${Math.round(res.best.cost_kcz).toLocaleString("cs-CZ")} Kč/rok${investInfo} → výkon přepsán`;
    }
  } catch (e) {
    alert("Chyba optimalizace:\n" + (e?.message || e));
    console.error(e);
  } finally {
    btn.disabled  = false;
    btn.textContent = "Spočítat optimum";
  }
}

async function exportCurve() {
  try {
    const r = await fetch(`${API_BASE}/api/export/curve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getInputs()),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "Krivka_export.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Chyba exportu:\n" + (e?.message || e));
    console.error(e);
  }
}

// ── Custom price section ──────────────────────────────────────────────────────

async function onSupplierChange() {
  const supplier = document.getElementById("supplier_key")?.value || "cez_2026";
  const isCustom = supplier === "custom";
  const infoEl   = document.getElementById("supplierPriceInfo");
  const formEl   = document.getElementById("customPriceForm");

  if (formEl) formEl.style.display = isCustom ? "" : "none";

  if (isCustom) {
    if (infoEl) infoEl.innerHTML = "";
    updateCustomPrice();
    return;
  }

  if (infoEl) infoEl.innerHTML = "<span style='color:#64748b; font-style:italic;'>Načítám ceník…</span>";
  try {
    const data = await apiGet(`/api/electricity-prices?supplier=${encodeURIComponent(supplier)}`);
    const tariffKey = (document.getElementById("electricity_tariff")?.value || "D56d").trim();
    const t = data.tariffs[tariffKey] || Object.values(data.tariffs)[0];
    if (!t) { infoEl.innerHTML = "<span style='color:#dc2626;'>Tarif nenalezen</span>"; return; }
    const dist = data.distribution;
    const sys  = data.system_total_czk_per_mwh;
    const vtTotal  = t.VT + dist.VT + sys;
    const ntTotal  = t.NT + dist.NT + sys;
    const vtShare  = data.vt_share;
    const avg      = vtShare * vtTotal + (1 - vtShare) * ntTotal;

    infoEl.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px; color:#0369a1;">${data.label}</div>
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr style="color:#475569;">
          <th style="text-align:left; padding:2px 4px; font-weight:600;">Složka (Kč/MWh bez DPH)</th>
          <th style="text-align:right; padding:2px 4px;">VT</th>
          <th style="text-align:right; padding:2px 4px;">NT</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:2px 4px;">Energie – dodavatel (${tariffKey})</td><td style="text-align:right;">${t.VT.toFixed(0)}</td><td style="text-align:right;">${t.NT.toFixed(0)}</td></tr>
          <tr><td style="padding:2px 4px;">Distribuce</td><td style="text-align:right;">${dist.VT.toFixed(0)}</td><td style="text-align:right;">${dist.NT.toFixed(0)}</td></tr>
          <tr><td style="padding:2px 4px;">Systémové služby + daň</td><td style="text-align:right;">${sys.toFixed(0)}</td><td style="text-align:right;">${sys.toFixed(0)}</td></tr>
          <tr style="font-weight:700; border-top:1px solid #93c5fd;">
            <td style="padding:2px 4px;">Celkem</td>
            <td style="text-align:right;">${vtTotal.toFixed(0)}</td>
            <td style="text-align:right;">${ntTotal.toFixed(0)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:6px;">Podíl VT: ${(vtShare*100).toFixed(0)} % → průměr ≈ <strong>${Math.round(avg).toLocaleString("cs-CZ")} Kč/MWh</strong></div>
      <div class="hint" style="margin-top:2px;">Paušál dle jističe se promítne v přesném výpočtu. Ceny jsou orientační – ověř platný ceník.</div>
    `;
    const priceEl = document.getElementById("price_kcz_per_mwh");
    if (priceEl) priceEl.value = Math.round(avg);
  } catch (e) {
    if (infoEl) infoEl.innerHTML = `<span style="color:#b45309;">⚠ Ceník nelze načíst – backend offline? (${e.message})</span>`;
  }
}

function updateCustomPrice() {
  const vt       = parseFloat(document.getElementById("custom_vt_kcz")?.value       || 0);
  const nt       = parseFloat(document.getElementById("custom_nt_kcz")?.value       || 0);
  const vtShareP = parseFloat(document.getElementById("custom_vt_share_pct")?.value || 5);
  const vtShare  = Math.max(0, Math.min(100, vtShareP)) / 100;
  const avg      = vtShare * vt + (1 - vtShare) * nt;
  const avgEl    = document.getElementById("customPriceAvg");
  const priceEl  = document.getElementById("price_kcz_per_mwh");
  if (avgEl)   avgEl.textContent  = `Průměr: ${Math.round(avg).toLocaleString("cs-CZ")} Kč/MWh`;
  if (priceEl) priceEl.value = Math.round(avg);
}

// ── Tariff sync ───────────────────────────────────────────────────────────────

function syncTariff() {
  const ct = document.getElementById("customer_type")?.value || "household";
  const t  = document.getElementById("electricity_tariff");
  const s  = document.getElementById("supplier_key");
  if (!t) return;

  const cur     = (t.value || "").trim();
  const desired = (ct === "business") ? "C56d" : "D56d";
  if (cur === "" || cur === "D56d" || cur === "D57d" || cur === "C56d") {
    t.value = desired;
  }

  if (s) {
    const householdSuppliers = ["cez_2026", "egd_2026", "pre_2026"];
    if (ct === "business" && householdSuppliers.includes(s.value)) {
      // Nemáme firemní ceník 2026 – přepni na vlastní zadání
      s.value = "custom";
    } else if (ct === "household" && s.value === "custom" && cur === "C56d") {
      s.value = "cez_2026";
    }
  }
  onSupplierChange();
}

// ── Wiring ────────────────────────────────────────────────────────────────────

document.getElementById("btnSim")?.addEventListener("click", simulate);
document.getElementById("btnOpt")?.addEventListener("click", optimize);
document.getElementById("btnExport")?.addEventListener("click", exportCurve);
document.getElementById("customer_type")?.addEventListener("change", () => { syncTariff(); simulate(); });
document.getElementById("supplier_key")?.addEventListener("change", async () => { await onSupplierChange(); simulate(); });
document.getElementById("electricity_tariff")?.addEventListener("change", () => { onSupplierChange(); });
// city_preset uses onchange directly in HTML
// btnFetchClimate uses onclick directly in HTML
document.getElementById("config_preset")?.addEventListener("change", applyConfigPreset);
document.getElementById("hp_modulation")?.addEventListener("change", () => { onModulationChange(); simulate(); });
document.getElementById("cooling_enabled")?.addEventListener("change", toggleCooling);
document.getElementById("custom_demand_file")?.addEventListener("change", loadCustomDemand);

// Custom price recalculation on any input change
["custom_vt_kcz", "custom_nt_kcz", "custom_vt_share_pct"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", updateCustomPrice);
});

// Mark manually-edited fields so onHpTypeChange doesn't reset them
["source_temp_c", "cop_nominal"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", function() {
    this._userEdited = true;
  });
});

populateYearSelect();
syncTariff();
onHpTypeChange();
onModulationChange();
onBivalenceTypeChange();
onBaseSourceTypeChange();
calcHeatingCurve();

(async function init() {
  await onSupplierChange();
  calcAccumulation();
})();
