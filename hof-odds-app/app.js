const hallData = window.HOF_DATA;

const positionOrder = ["SP", "RP", "C", "1B", "2B", "3B", "SS", "OF", "DH", "Manager", "Other"];

const activeTeams = [
  ["ARI", "Arizona Diamondbacks"],
  ["ATL", "Atlanta Braves"],
  ["BAL", "Baltimore Orioles"],
  ["BOS", "Boston Red Sox"],
  ["CHA", "Chicago White Sox"],
  ["CHN", "Chicago Cubs"],
  ["CIN", "Cincinnati Reds"],
  ["CLE", "Cleveland Guardians"],
  ["COL", "Colorado Rockies"],
  ["DET", "Detroit Tigers"],
  ["HOU", "Houston Astros"],
  ["KCA", "Kansas City Royals"],
  ["LAA", "Los Angeles Angels"],
  ["LAN", "Los Angeles Dodgers"],
  ["MIA", "Miami Marlins"],
  ["MIL", "Milwaukee Brewers"],
  ["MIN", "Minnesota Twins"],
  ["NYA", "New York Yankees"],
  ["NYN", "New York Mets"],
  ["ATH", "Athletics"],
  ["PHI", "Philadelphia Phillies"],
  ["PIT", "Pittsburgh Pirates"],
  ["SDN", "San Diego Padres"],
  ["SFN", "San Francisco Giants"],
  ["SEA", "Seattle Mariners"],
  ["SLN", "St. Louis Cardinals"],
  ["TBA", "Tampa Bay Rays"],
  ["TEX", "Texas Rangers"],
  ["TOR", "Toronto Blue Jays"],
  ["WAS", "Washington Nationals"],
];

const activeTeamCodes = new Set(activeTeams.map(([code]) => code));

const columns = [
  ["name", "Player"],
  ["position", "Pos"],
  ["inductedYear", "Year"],
  ["method", "Path"],
  ["teams", "Teams"],
  ["G", "G"],
  ["H", "H"],
  ["HR", "HR"],
  ["AVG", "AVG"],
  ["SLG", "SLG"],
  ["OBP", "OBP"],
  ["2B", "2B"],
  ["3B", "3B"],
  ["SB", "SB"],
  ["BB", "BB"],
  ["SO", "SO"],
  ["W", "W"],
  ["L", "L"],
  ["ERA", "ERA"],
  ["K9", "K/9"],
  ["bWAR", "bWAR"],
  ["fWAR", "fWAR"],
];

const state = {
  sortKey: "bWAR",
  sortDir: "desc",
  filters: {
    position: "All",
    method: "All",
    team: "All",
    year: "All",
    search: "",
  },
};

const els = {
  playerSearch: document.querySelector("#playerSearch"),
  playerSuggestions: document.querySelector("#playerSuggestions"),
  searchBtn: document.querySelector("#searchBtn"),
  resultCard: document.querySelector("#resultCard"),
  positionFilter: document.querySelector("#positionFilter"),
  methodFilter: document.querySelector("#methodFilter"),
  teamFilter: document.querySelector("#teamFilter"),
  yearFilter: document.querySelector("#yearFilter"),
  tableSearch: document.querySelector("#tableSearch"),
  questionInput: document.querySelector("#questionInput"),
  questionBtn: document.querySelector("#questionBtn"),
  questionResult: document.querySelector("#questionResult"),
  tableHead: document.querySelector("#tableHead"),
  hofBody: document.querySelector("#hofBody"),
  rowCount: document.querySelector("#rowCount"),
};

function fmt(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (typeof value === "number") {
    if (["AVG", "OBP", "SLG"].includes(digits)) return value.toFixed(3).replace(/^0/, "");
    if (digits === "year") return String(value);
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }
  return value;
}

function stat(player, key) {
  if (key === "teams") return player.teams.map(teamName).join(", ");
  return key in player ? player[key] : player.stats[key];
}

function populateSelect(select, values, label = "All") {
  select.innerHTML = "";
  [label, ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function initFilters() {
  const players = hallData.players;
  populateSelect(els.positionFilter, positionOrder.filter((pos) => players.some((p) => p.position === pos)));
  populateSelect(els.methodFilter, [...new Set(players.map((p) => p.method).filter(Boolean))].sort());
  populateTeamSelect();
  populateSelect(els.yearFilter, [...new Set(players.map((p) => String(p.inductedYear)))].sort((a, b) => b - a));

  els.positionFilter.addEventListener("change", () => updateFilter("position", els.positionFilter.value));
  els.methodFilter.addEventListener("change", () => updateFilter("method", els.methodFilter.value));
  els.teamFilter.addEventListener("change", () => updateFilter("team", els.teamFilter.value));
  els.yearFilter.addEventListener("change", () => updateFilter("year", els.yearFilter.value));
  els.tableSearch.addEventListener("input", () => updateFilter("search", els.tableSearch.value.trim().toLowerCase()));
}

function debounce(fn, delay = 220) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const localPlayerNames = [...new Set([
  ...hallData.players.filter((player) => player.category === "Player").map((player) => player.name),
  ...(hallData.candidates || []).map((player) => player.name),
])].sort((a, b) => a.localeCompare(b));

const hallPlayerByName = new Map(
  hallData.players
    .filter((player) => player.category === "Player")
    .map((player) => [normalizeName(player.name), player])
);

const candidateByName = new Map(
  (hallData.candidates || []).map((player) => [normalizeName(player.name), player])
);

const manualHallInductees = [
  {
    name: "Carlos Beltran",
    inductedYear: 2026,
    method: "BBWAA",
    ballotHistory: [
      { year: 2026, body: "BBWAA", inducted: true, votes: 358, ballots: 425, needed: 319, pct: 84.2, neededNote: null },
    ],
  },
  {
    name: "Andruw Jones",
    inductedYear: 2026,
    method: "BBWAA",
    ballotHistory: [
      { year: 2026, body: "BBWAA", inducted: true, votes: 333, ballots: 425, needed: 319, pct: 78.4, neededNote: null },
    ],
  },
];

applyManualHallInductees();

const playerContextNotes = new Map([
  ["barry bonds", "Voter support has also been affected by long-running public links to performance-enhancing drugs."],
  ["roger clemens", "Voter support has also been affected by long-running public links to performance-enhancing drugs."],
  ["mark mcgwire", "Voter support has also been affected by public links to performance-enhancing drugs."],
  ["sammy sosa", "Voter support has also been affected by public links to performance-enhancing drugs."],
  ["rafael palmeiro", "Voter support has also been affected by a performance-enhancing drug suspension."],
  ["manny ramirez", "Voter support has also been affected by performance-enhancing drug suspensions."],
  ["alex rodriguez", "Voter support has also been affected by performance-enhancing drug links and suspension history."],
  ["andy pettitte", "Voter support may also be affected by public links to performance-enhancing drugs."],
  ["kevin brown", "Voter support may also be affected by public links to performance-enhancing drugs."],
  ["gary sheffield", "Voter support has also been affected by public links to performance-enhancing drugs."],
  ["jose canseco", "Voter support has also been affected by public links to performance-enhancing drugs."],
  ["robinson cano", "Future Hall consideration will also be affected by performance-enhancing drug suspensions."],
  ["shoeless joe jackson", "Hall eligibility and historical consideration are also shaped by his gambling-related ban after the 1919 Black Sox scandal."],
  ["joe jackson", "Hall eligibility and historical consideration are also shaped by his gambling-related ban after the 1919 Black Sox scandal."],
  ["pete rose", "Hall eligibility and historical consideration are also shaped by his gambling-related lifetime ban."],
]);

function playerContextNote(name) {
  return playerContextNotes.get(normalizeName(name)) || "";
}

function applyManualHallInductees() {
  manualHallInductees.forEach((override) => {
    const key = normalizeName(override.name);
    if (hallPlayerByName.has(key)) return;
    const candidate = candidateByName.get(key);
    const inductee = {
      id: candidate?.id || key.replace(/\s+/g, ""),
      name: candidate?.name || override.name,
      position: candidate?.position || "OF",
      roleGroup: candidate?.roleGroup || "Position Player",
      category: "Player",
      inductedYear: override.inductedYear,
      method: override.method,
      teams: candidate?.teams || [],
      stats: candidate?.stats || {},
      ballotHistory: mergeBallotHistory(override.ballotHistory, candidate?.ballotHistory || []),
    };
    hallData.players.push(inductee);
    hallPlayerByName.set(normalizeName(inductee.name), inductee);
  });
}

function mergeBallotHistory(priorityRows, existingRows) {
  const seen = new Set();
  return [...priorityRows, ...existingRows]
    .filter((row) => {
      const key = `${row.year}-${row.body}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.year - a.year);
}

function normalizeName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function updatePlayerSuggestions() {
  const query = els.playerSearch.value.trim();
  if (query.length < 2) {
    renderPlayerSuggestions([]);
    return;
  }
  const lower = query.toLowerCase();
  const local = localPlayerNames
    .filter((name) => name.toLowerCase().includes(lower))
    .slice(0, 10)
    .map((name) => ({ name, source: "Local" }));
  renderPlayerSuggestions(local);
  let remote = [];
  try {
    const search = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}`);
    remote = (search.people || [])
      .map((player) => ({ name: player.fullName, source: player.primaryPosition?.abbreviation || "MLB" }))
      .filter((player) => player.name)
      .slice(0, 8);
  } catch {
    remote = [];
  }
  const seen = new Set();
  const merged = [...remote, ...local].filter((player) => {
    if (seen.has(player.name)) return false;
    seen.add(player.name);
    return true;
  }).slice(0, 12);
  if (els.playerSearch.value.trim().toLowerCase() === lower) renderPlayerSuggestions(merged);
}

function renderPlayerSuggestions(players) {
  if (!players.length) {
    els.playerSuggestions.innerHTML = "";
    els.playerSuggestions.hidden = true;
    return;
  }
  els.playerSuggestions.hidden = false;
  els.playerSuggestions.innerHTML = players.map((player) => `
    <button class="suggestion-item" type="button" role="option" data-name="${escapeHtml(player.name)}">
      <span>${escapeHtml(player.name)}</span>
      <span class="suggestion-meta">${escapeHtml(player.source)}</span>
    </button>
  `).join("");
}

function populateTeamSelect() {
  const usedTeams = new Set(hallData.players.flatMap((p) => p.teams));
  els.teamFilter.innerHTML = "";
  const all = document.createElement("option");
  all.value = "All";
  all.textContent = "All";
  els.teamFilter.append(all);

  const activeGroup = document.createElement("optgroup");
  activeGroup.label = "Active MLB Teams";
  activeTeams.forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    activeGroup.append(option);
  });
  els.teamFilter.append(activeGroup);

  const inactiveCodes = [...usedTeams]
    .filter((code) => !activeTeamCodes.has(code))
    .filter((code) => !activeTeamCodes.has(hallData.teamFranchises?.[code]?.activeCode))
    .sort((a, b) => teamName(a).localeCompare(teamName(b)));
  if (inactiveCodes.length) {
    const inactiveGroup = document.createElement("optgroup");
    inactiveGroup.label = "Inactive and Historical Teams";
    inactiveCodes.forEach((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = teamName(code);
      inactiveGroup.append(option);
    });
    els.teamFilter.append(inactiveGroup);
  }
}

function teamName(code) {
  const activeName = activeTeams.find(([teamCode]) => teamCode === code)?.[1];
  if (activeName) return activeName;
  const franchise = hallData.teamFranchises?.[code];
  if (franchise && activeTeamCodes.has(franchise.activeCode)) {
    const lineage = franchise.lineageNames?.length ? franchise.lineageNames : [franchise.historicalName, franchise.activeName];
    const currentName = activeTeams.find(([teamCode]) => teamCode === franchise.activeCode)?.[1];
    if (currentName) lineage[lineage.length - 1] = currentName;
    return [...new Set(lineage)].join(" -> ");
  }
  return hallData.teamNames?.[code] || code;
}

function teamCodesForFilter(code) {
  if (!activeTeamCodes.has(code)) return new Set([code]);
  const linked = Object.entries(hallData.teamFranchises || {})
    .filter(([, franchise]) => franchise.activeCode === code)
    .map(([teamCode]) => teamCode);
  linked.push(code);
  return new Set(linked);
}

function updateFilter(key, value) {
  state.filters[key] = value;
  renderTable();
}

function renderHead() {
  els.tableHead.innerHTML = "";
  columns.forEach(([key, label]) => {
    const th = document.createElement("th");
    const active = state.sortKey === key;
    th.textContent = active ? `${label} ${state.sortDir === "asc" ? "▲" : "▼"}` : label;
    th.addEventListener("click", () => {
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = ["name", "position", "method", "teams"].includes(key) ? "asc" : "desc";
      }
      renderTable();
    });
    els.tableHead.append(th);
  });
}

function filteredPlayers() {
  return hallData.players.filter((player) => {
    const f = state.filters;
    if (f.position !== "All" && player.position !== f.position) return false;
    if (f.method !== "All" && player.method !== f.method) return false;
    if (f.team !== "All" && !player.teams.some((team) => teamCodesForFilter(f.team).has(team))) return false;
    if (f.year !== "All" && String(player.inductedYear) !== f.year) return false;
    if (f.search) {
      const haystack = `${player.name} ${player.teams.join(" ")} ${player.teams.map(teamName).join(" ")}`.toLowerCase();
      if (!haystack.includes(f.search)) return false;
    }
    return true;
  });
}

function renderTable() {
  renderHead();
  const rows = filteredPlayers().sort((a, b) => {
    const av = stat(a, state.sortKey);
    const bv = stat(b, state.sortKey);
    const dir = state.sortDir === "asc" ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });

  els.hofBody.innerHTML = "";
  rows.forEach((player) => {
    const tr = document.createElement("tr");
    columns.forEach(([key]) => {
      const td = document.createElement("td");
      const value = stat(player, key);
      td.textContent = ["AVG", "OBP", "SLG"].includes(key)
        ? fmt(value, key)
        : fmt(value, key === "inductedYear" ? "year" : key === "ERA" || key === "K9" || key === "bWAR" || key === "fWAR" ? 1 : 0);
      tr.append(td);
    });
    els.hofBody.append(tr);
  });
  els.rowCount.textContent = `${rows.length} of ${hallData.players.length} inductees`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function analyzePlayer() {
  const query = els.playerSearch.value.trim();
  if (!query) return;
  els.searchBtn.disabled = true;
  els.searchBtn.textContent = "Analyzing";
  els.resultCard.className = "result-card";
  els.resultCard.innerHTML = `<p class="eyebrow">Forecast</p><h2>Looking up ${escapeHtml(query)}</h2><p>Pulling current career totals and comparing against Hall baselines.</p>`;

  try {
    const search = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}`);
    const player = search.people?.[0];
    if (!player) throw new Error("No MLB player found for that name.");

    const [hitting, pitching] = await Promise.all([
      fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?stats=career&group=hitting`),
      fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?stats=career&group=pitching`),
    ]);
    const profile = normalizePlayer(player, getStat(hitting), getStat(pitching));
    const hallMatch = hallPlayerByName.get(normalizeName(profile.name));
    if (hallMatch) {
      profile.isHallOfFamer = true;
      profile.hallInfo = hallMatch;
      profile.ballotHistory = hallMatch.ballotHistory || [];
    }
    const candidateMatch = candidateByName.get(normalizeName(profile.name));
    if (candidateMatch) {
      profile.finalYear = candidateMatch.finalYear;
      profile.retired = candidateMatch.retired;
      profile.bbwAA = candidateMatch.bbwAA;
      if (!profile.isHallOfFamer) profile.ballotHistory = candidateMatch.ballotHistory || [];
      profile.careerWarForCap = candidateMatch.stats?.bWAR;
      if (candidateMatch.retired) {
        profile.position = candidateMatch.position;
        profile.roleGroup = candidateMatch.roleGroup;
        profile.current.bWAR = estimateWar(profile.current, profile.roleGroup);
        profile.current.fWAR = Number((profile.current.bWAR * (profile.roleGroup === "Starting Pitcher" ? 1.03 : profile.roleGroup === "Relief Pitcher" ? 1.06 : 0.98)).toFixed(1));
        profile.projected = { ...profile.current };
      }
    }
    const forecast = hallMatch
      ? {
          score: 100,
          range: "100%",
          parts: [{ label: "Hall induction", value: hallMatch.inductedYear, good: true }],
          baselineCount: hallData.baselines[profile.roleGroup]?.count || 0,
          baselineLabel: `${profile.position} Hall peers`,
          inducted: true,
        }
      : scoreProfile(profile);
    renderForecast(profile, forecast);
  } catch (error) {
    els.resultCard.innerHTML = `<p class="eyebrow">Forecast</p><h2>Could not complete lookup</h2><p class="error">${escapeHtml(error.message)}</p><p>Check the spelling or try a more specific full name.</p>`;
  } finally {
    els.searchBtn.disabled = false;
    els.searchBtn.textContent = "Analyze";
  }
}

function getStat(payload) {
  return payload?.stats?.[0]?.splits?.[0]?.stat ?? {};
}

function normalizePlayer(player, hitting, pitching) {
  const pos = player.primaryPosition?.abbreviation ?? "";
  const pGames = toNumber(pitching.gamesPlayed);
  const hittingGames = toNumber(hitting.gamesPlayed);
  const gamesStarted = toNumber(pitching.gamesStarted);
  const saves = toNumber(pitching.saves);
  const significantPitching = pGames >= 80 && pGames > hittingGames * 0.5;
  const isPitcher = pos === "P" || (!hittingGames && pGames > 0) || significantPitching;
  const isRelief = isPitcher && (saves >= 50 || (pGames > 80 && gamesStarted / Math.max(1, pGames) < 0.35));
  const roleGroup = isRelief ? "Relief Pitcher" : isPitcher ? "Starting Pitcher" : "Position Player";
  const debutYear = player.mlbDebutDate ? Number(player.mlbDebutDate.slice(0, 4)) : new Date().getFullYear();
  const seasons = Math.max(1, new Date().getFullYear() - debutYear + 1);
  const age = toNumber(player.currentAge);
  const active = Boolean(player.active);

  const stats = {
    G: toNumber(hitting.gamesPlayed || pitching.gamesPlayed),
    H: toNumber(hitting.hits),
    HR: toNumber(hitting.homeRuns),
    AVG: rate(hitting.avg),
    OBP: rate(hitting.obp),
    SLG: rate(hitting.slg),
    "2B": toNumber(hitting.doubles),
    "3B": toNumber(hitting.triples),
    SB: toNumber(hitting.stolenBases),
    BB: toNumber(hitting.baseOnBalls),
    SO: toNumber(hitting.strikeOuts || pitching.strikeOuts),
    W: toNumber(pitching.wins),
    L: toNumber(pitching.losses),
    SV: saves,
    ERA: rate(pitching.era),
    K9: rate(pitching.strikeoutsPer9Inn),
  };
  stats.bWAR = estimateWar(stats, roleGroup);
  stats.fWAR = Number((stats.bWAR * (roleGroup === "Starting Pitcher" ? 1.03 : roleGroup === "Relief Pitcher" ? 1.06 : 0.98)).toFixed(1));

  const projected = projectStats(stats, roleGroup, seasons, age, active);
  projected.bWAR = estimateWar(projected, roleGroup);
  projected.fWAR = Number((projected.bWAR * (roleGroup === "Starting Pitcher" ? 1.03 : roleGroup === "Relief Pitcher" ? 1.06 : 0.98)).toFixed(1));

  return {
    id: player.id,
    name: player.fullName,
    age,
    active,
    position: isRelief ? "RP" : normalizeDisplayPosition(pos),
    roleGroup,
    seasons,
    current: stats,
    projected,
  };
}

function normalizeDisplayPosition(pos) {
  if (pos === "P") return "SP";
  if (["LF", "CF", "RF"].includes(pos)) return "OF";
  return pos;
}

function projectStats(stats, roleGroup, seasons, age, active) {
  const projected = { ...stats };
  if (!active || !age || age >= 41) return projected;

  const remaining = Math.max(0, Math.min(7, 41 - age));
  const decline = age < 30 ? 0.86 : age < 34 ? 0.66 : age < 37 ? 0.42 : 0.22;
  const multiplier = remaining * decline / Math.max(1, seasons);
  const countingKeys = roleGroup === "Position Player"
    ? ["G", "H", "HR", "2B", "3B", "SB", "BB", "SO"]
    : ["G", "SO", "W", "L", "SV"];

  countingKeys.forEach((key) => {
    projected[key] = Math.round(stats[key] + stats[key] * multiplier);
  });
  return projected;
}

function estimateWar(stats, roleGroup) {
  if (roleGroup === "Position Player") {
    const totalBases = stats.H - stats["2B"] - stats["3B"] - stats.HR + 2 * stats["2B"] + 3 * stats["3B"] + 4 * stats.HR;
    const power = totalBases * 0.012;
    const table = stats.H * 0.01 + stats.BB * 0.006 + stats.SB * 0.012 - stats.SO * 0.002;
    return Number(Math.max(0, power + table - stats.G * 0.004).toFixed(1));
  }
  if (roleGroup === "Relief Pitcher") {
    const saveValue = stats.SV * 0.075;
    const runValue = Math.max(0, 4.4 - (stats.ERA || 4.4)) * Math.max(1, stats.G) / 48;
    const kValue = Math.max(0, (stats.K9 || 7) - 7) * Math.max(1, stats.G) / 180;
    return Number(Math.max(0, saveValue + runValue + kValue).toFixed(1));
  }
  const winValue = stats.W * 0.21;
  const runValue = Math.max(0, 4.7 - (stats.ERA || 4.7)) * Math.max(1, stats.G) / 24;
  const kValue = Math.max(0, (stats.K9 || 6) - 6) * Math.max(1, stats.G) / 180;
  return Number(Math.max(0, winValue + runValue + kValue).toFixed(1));
}

function weightedQuantile(rows, key, q) {
  const values = rows
    .map((row) => ({ value: row.stats?.[key], weight: inductionWeight(row) }))
    .filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(row.value))
    .sort((a, b) => a.value - b.value);
  if (!values.length) return null;
  const total = values.reduce((sum, row) => sum + row.weight, 0);
  const target = total * q;
  let running = 0;
  for (const row of values) {
    running += row.weight;
    if (running >= target) return row.value;
  }
  return values[values.length - 1].value;
}

function inductionWeight(player) {
  const currentYear = new Date().getFullYear();
  const cutoff = currentYear - 30;
  if (player.inductedYear >= cutoff) return 3;
  if (player.inductedYear >= cutoff - 15) return 1.6;
  return 1;
}

function comparisonRows(profile) {
  const players = hallData.players.filter((player) => player.category === "Player");
  const samePosition = players.filter((player) => player.position === profile.position);
  if (samePosition.length >= 3) return { rows: samePosition, label: `${profile.position} Hall peers` };
  const sameRole = players.filter((player) => player.roleGroup === profile.roleGroup);
  return { rows: sameRole, label: `${profile.roleGroup} Hall peers` };
}

function comparisonBaseline(profile) {
  const { rows, label } = comparisonRows(profile);
  const keys = ["bWAR", "fWAR", "H", "HR", "W", "SV", "ERA", "K9", "G"];
  const base = { count: rows.length, label };
  keys.forEach((key) => {
    base[key] = {
      p25: weightedQuantile(rows, key, 0.25),
      p50: weightedQuantile(rows, key, 0.5),
      p75: weightedQuantile(rows, key, 0.75),
    };
  });
  if (profile.roleGroup === "Starting Pitcher") applyModernStarterAdjustment(base);
  return base;
}

function applyModernStarterAdjustment(base) {
  ["W", "G", "bWAR", "fWAR"].forEach((key) => {
    if (!base[key]) return;
    ["p25", "p50", "p75"].forEach((q) => {
      if (Number.isFinite(base[key][q])) base[key][q] *= key === "W" ? 0.82 : 0.9;
    });
  });
  if (base.K9) {
    ["p25", "p50", "p75"].forEach((q) => {
      if (Number.isFinite(base.K9[q])) base.K9[q] *= 1.08;
    });
  }
}

function scoreProfile(profile) {
  const base = comparisonBaseline(profile);
  const p = profile.projected;
  const parts = [];
  let score = 0;

  if (profile.roleGroup === "Position Player") {
    parts.push(metricScore("bWAR", p.bWAR, base.bWAR, 18));
    parts.push(metricScore("fWAR", p.fWAR, base.fWAR, 12));
    parts.push(metricScore("H", p.H, base.H, 18));
    parts.push(metricScore("HR", p.HR, base.HR, 15));
    parts.push(metricScore("OBP", p.OBP, { p25: 0.34, p50: 0.37, p75: 0.4 }, 10));
    parts.push(metricScore("SLG", p.SLG, { p25: 0.43, p50: 0.47, p75: 0.52 }, 10));
    parts.push(milestoneScore(p, ["H", 3000, 12], ["HR", 500, 10], ["HR", 400, 6], ["SB", 500, 4]));
    parts.push(ratePeakScore(p));
  } else if (profile.roleGroup === "Relief Pitcher") {
    parts.push(metricScore("bWAR", p.bWAR, base.bWAR, 14));
    parts.push(metricScore("fWAR", p.fWAR, base.fWAR, 10));
    parts.push(metricScore("SV", p.SV, base.SV, 28));
    parts.push(metricScore("K9", p.K9, base.K9, 12));
    parts.push(metricScore("ERA", p.ERA, base.ERA, 14, true));
    parts.push(milestoneScore(p, ["SV", 400, 14], ["SV", 300, 8]));
  } else {
    parts.push(metricScore("bWAR", p.bWAR, base.bWAR, 18));
    parts.push(metricScore("fWAR", p.fWAR, base.fWAR, 12));
    parts.push(metricScore("W", p.W, base.W, 14));
    parts.push(metricScore("K9", p.K9, base.K9, 15));
    parts.push(metricScore("ERA", p.ERA, base.ERA, 18, true));
    parts.push(metricScore("G", p.G, base.G, 8));
    parts.push(milestoneScore(p, ["W", 250, 8], ["W", 220, 5], ["W", 200, 3]));
  }

  score = Math.min(99, Math.max(1, parts.reduce((sum, part) => sum + part.points, 0)));
  score = applyActiveCareerReality(profile, score);
  score = applyBallotReality(profile, score);
  const range = `${Math.max(1, Math.round(score - 8))}-${Math.min(99, Math.round(score + 8))}%`;
  return { score: Math.round(score), range, parts: parts.filter((p) => p.label), baselineCount: base.count, baselineLabel: base.label };
}

function applyActiveCareerReality(profile, score) {
  if (!profile.active || profile.isHallOfFamer) return score;
  const stats = profile.current || {};
  const seasons = Math.max(1, profile.seasons || 1);
  const war = Number(stats.bWAR || 0);
  const warPace = war / seasons;
  const ops = (stats.OBP || 0) + (stats.SLG || 0);
  const youngHistoricStart = isHistoricActiveStart(profile, stats, warPace, ops);
  if (youngHistoricStart) return score;

  let cap = 99;
  if (profile.roleGroup === "Position Player") {
    if (war < 8 && stats.H < 500 && stats.HR < 75 && stats.G < 450) cap = 8;
    else if (war < 15 && stats.H < 900 && stats.HR < 125 && stats.G < 800) cap = 18;
    else if (war < 25 && stats.H < 1200 && stats.HR < 180 && stats.G < 1100) cap = 35;
  } else if (profile.roleGroup === "Relief Pitcher") {
    if (war < 5 && stats.SV < 80 && stats.G < 180) cap = 8;
    else if (war < 12 && stats.SV < 180 && stats.G < 360) cap = 18;
    else if (war < 20 && stats.SV < 260 && stats.G < 520) cap = 35;
  } else {
    if (war < 8 && stats.W < 40 && stats.G < 100) cap = 8;
    else if (war < 15 && stats.W < 80 && stats.G < 180) cap = 18;
    else if (war < 25 && stats.W < 120 && stats.G < 280) cap = 35;
  }

  if (seasons <= 3 && cap > 12) cap = 12;
  if (seasons <= 5 && cap > 24 && warPace < 3.5) cap = 24;
  return Math.min(score, cap);
}

function isHistoricActiveStart(profile, stats, warPace, ops) {
  const seasons = Math.max(1, profile.seasons || 1);
  if (profile.roleGroup === "Position Player") {
    return seasons <= 6 && (
      warPace >= 5 ||
      stats.bWAR >= 25 ||
      stats.H >= 900 ||
      stats.HR >= 160 ||
      (ops >= 0.9 && stats.G >= 400)
    );
  }
  if (profile.roleGroup === "Relief Pitcher") {
    return seasons <= 6 && (
      warPace >= 2.5 ||
      stats.SV >= 160 ||
      (stats.SV >= 100 && stats.ERA && stats.ERA <= 2.75 && stats.K9 >= 10)
    );
  }
  return seasons <= 6 && (
    warPace >= 4.5 ||
    stats.W >= 70 ||
    (stats.W >= 45 && stats.ERA && stats.ERA <= 3.3 && stats.K9 >= 8)
  );
}

function applyBallotReality(profile, score) {
  if (profile.isHallOfFamer || profile.active) return score;
  const war = Number(profile.careerWarForCap ?? profile.current?.bWAR ?? profile.projected?.bWAR ?? 0);
  const warThreshold = profile.roleGroup === "Relief Pitcher" ? 20 : 40;
  if (war > warThreshold) return score;
  const finalYear = profile.finalYear;
  const retiredMoreThanFive = finalYear && finalYear <= new Date().getFullYear() - 6;
  if (!retiredMoreThanFive) return score;

  const ballot = profile.bbwAA || {};
  const appearances = Number(ballot.appearances || 0);
  const maxPct = Number(ballot.maxPct || 0);
  if (appearances === 0 || maxPct <= 1) return Math.min(score, 1.5);
  if (maxPct < 5) return Math.min(score, 5);
  if (maxPct < 10) return Math.min(score, 9);
  if (maxPct < 25) return Math.min(score, 18);
  if (maxPct < 50) return Math.min(score, 35);
  return score;
}

function scoreCandidate(candidate) {
  const active = candidate.active2025;
  const age = candidate.birthYear ? 2026 - candidate.birthYear : 0;
  const seasons = candidate.debutYear ? Math.max(1, (candidate.finalYear || 2025) - candidate.debutYear + 1) : 1;
  const projected = projectStats(candidate.stats, candidate.roleGroup, seasons, age, active);
  projected.bWAR = candidate.stats.bWAR;
  projected.fWAR = candidate.stats.fWAR;
  if (active) {
    const future = projectStats(candidate.stats, candidate.roleGroup, seasons, age, true);
    projected.bWAR = estimateWar(future, candidate.roleGroup);
    projected.fWAR = Number((projected.bWAR * (candidate.roleGroup === "Starting Pitcher" ? 1.03 : candidate.roleGroup === "Relief Pitcher" ? 1.06 : 0.98)).toFixed(1));
    Object.assign(projected, future);
  }
  return scoreProfile({ ...candidate, projected, active, age, bbwAA: candidate.bbwAA });
}

function answerQuestion() {
  const raw = els.questionInput.value.trim();
  if (!raw) return;
  const question = raw.toLowerCase();
  let pool = [...(hallData.candidates || [])];
  const wantsActive = /\bactive|current|playing\b/.test(question);
  const wantsRetired = /\bretired|eligible|not inducted|not been inducted|non-inducted|outside\b/.test(question);
  const wantsRelief = /\brelief|closer|saves|rp\b/.test(question);
  const wantsStarter = /\bstarter|starting|sp\b/.test(question);
  const wantsPositionPlayers = /\bposition player|hitters|hitter|batters|batter\b/.test(question);
  const wantsPitchers = /\bpitcher|pitchers\b/.test(question);

  if (wantsActive) pool = pool.filter((candidate) => candidate.active2025);
  if (wantsRetired && !wantsActive) pool = pool.filter((candidate) => candidate.retired);
  if (wantsRelief) pool = pool.filter((candidate) => candidate.roleGroup === "Relief Pitcher");
  if (wantsStarter) pool = pool.filter((candidate) => candidate.roleGroup === "Starting Pitcher");
  if (wantsPositionPlayers) pool = pool.filter((candidate) => candidate.roleGroup === "Position Player");
  if (wantsPitchers && !wantsRelief && !wantsStarter) pool = pool.filter((candidate) => candidate.roleGroup !== "Position Player");

  const scored = pool
    .map((candidate) => ({ candidate, forecast: scoreCandidate(candidate) }))
    .sort((a, b) => b.forecast.score - a.forecast.score || (b.candidate.stats.bWAR || 0) - (a.candidate.stats.bWAR || 0))
    .slice(0, 12);

  const title = wantsActive
    ? "Active Players With The Highest Hall Likelihood"
    : wantsRetired
      ? "Retired Non-Inducted Players With The Highest Hall Likelihood"
      : "Highest Hall Likelihood Among Non-Inducted Candidates";
  renderQuestionAnswer(title, raw, scored, wantsActive);
}

function renderQuestionAnswer(title, raw, scored, activeMode) {
  if (!scored.length) {
    els.questionResult.innerHTML = `<p class="eyebrow">Answer</p><h2>${escapeHtml(title)}</h2><p>No matching candidates found for "${escapeHtml(raw)}". Try asking for active players, retired players, starters, relievers, or hitters.</p>`;
    return;
  }
  const rows = scored.map(({ candidate, forecast }, index) => {
    const context = playerContextNote(candidate.name);
    const keyStat = candidate.roleGroup === "Relief Pitcher"
      ? `${fmt(candidate.stats.SV)} SV`
      : candidate.roleGroup === "Starting Pitcher"
        ? `${fmt(candidate.stats.W)} W`
        : `${fmt(candidate.stats.H)} H, ${fmt(candidate.stats.HR)} HR`;
    const status = candidate.active2025 ? "Active in 2025" : candidate.finalYear ? `Last played ${candidate.finalYear}` : "Retired";
    const ballotNote = shortBallotNote(candidate);
    const contextLabel = [ballotNote, context]
      .filter(Boolean)
      .map((note) => `<br><small class="context-note">${escapeHtml(note)}</small>`)
      .join("");
    return `
      <div class="answer-row">
        <span>${index + 1}</span>
        <span><b>${escapeHtml(candidate.name)}</b><br><small>${escapeHtml(candidate.position)} · ${escapeHtml(candidate.roleGroup)}</small>${contextLabel}</span>
        <span class="answer-score">${forecast.score}%</span>
        <span>${escapeHtml(keyStat)}</span>
        <span>${escapeHtml(status)} · ${escapeHtml(teamSummary(candidate.teams))}</span>
      </div>
    `;
  }).join("");
  const note = activeMode
    ? "Active rankings use 2025 Lahman status plus the same age-based projection used by the player lookup."
    : "Retired rankings exclude inducted players and use career totals through the 2025 Lahman release.";
  els.questionResult.innerHTML = `
    <p class="eyebrow">Answer</p>
    <h2>${escapeHtml(title)}</h2>
    <p class="source-note">${note}</p>
    <div class="answer-table">
      <div class="answer-row header"><span>#</span><span>Name</span><span>Odds</span><span>Key stat</span><span>Status / teams</span></div>
      ${rows}
    </div>
  `;
}

function shortBallotNote(candidate) {
  if (candidate.active2025 || !candidate.finalYear || candidate.finalYear > new Date().getFullYear() - 6) return "";
  const ballot = candidate.bbwAA || {};
  const appearances = Number(ballot.appearances || 0);
  const maxPct = Number(ballot.maxPct || 0);
  if (appearances === 0) return "No BBWAA ballot appearance after 5+ retired years";
  if (maxPct <= 1) return "Max BBWAA support at or below 1%";
  if (maxPct < 5) return `Low BBWAA peak: ${maxPct.toFixed(1)}%`;
  return "";
}

function teamSummary(teams) {
  if (!teams?.length) return "No team data";
  const names = teams.map(teamName);
  return names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : "");
}

function metricScore(label, value, q, weight, inverse = false) {
  if (value === null || value === undefined || !q?.p50) return { points: 0 };
  let ratio;
  if (inverse) {
    ratio = q.p50 / Math.max(0.01, value);
  } else {
    ratio = value / Math.max(0.01, q.p50);
  }
  const points = Math.max(0, Math.min(weight, weight * (ratio - 0.35) / 0.85));
  return { label, value, points, median: q.p50, good: ratio >= 1 };
}

function milestoneScore(stats, ...milestones) {
  const hit = milestones.find(([key, target]) => stats[key] >= target);
  return hit ? { label: `${hit[0]} milestone`, value: hit[1], points: hit[2], good: true } : { points: 0 };
}

function ratePeakScore(stats) {
  const ops = (stats.OBP || 0) + (stats.SLG || 0);
  if (ops >= 0.9 && stats.G >= 1400) return { label: "elite OPS", value: ops, points: 10, good: true };
  if (ops >= 0.85 && stats.G >= 1400) return { label: "strong OPS", value: ops, points: 6, good: true };
  return { points: 0 };
}

function renderForecast(profile, forecast) {
  const p = profile.current;
  const synopsis = buildSynopsis(profile, forecast);
  const relevantStats = profile.roleGroup === "Position Player"
    ? [["bWAR", p.bWAR], ["fWAR", p.fWAR], ["Hits", p.H], ["HR", p.HR], ["OPS", ((p.OBP || 0) + (p.SLG || 0)).toFixed(3).replace(/^0/, "")]]
    : [["bWAR", p.bWAR], ["fWAR", p.fWAR], [profile.roleGroup === "Relief Pitcher" ? "Saves" : "Wins", profile.roleGroup === "Relief Pitcher" ? p.SV : p.W], ["ERA", p.ERA], ["K/9", p.K9]];
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  els.resultCard.innerHTML = `
    ${profile.isHallOfFamer ? `<div class="hof-banner">Hall of Fame Inductee · ${escapeHtml(String(profile.hallInfo.inductedYear))} · ${escapeHtml(profile.hallInfo.method)}</div>` : ""}
    <div class="score-layout">
      <div class="score-ring" style="--score:${forecast.score}%"><span>${forecast.score}%</span></div>
      <div>
        <p class="eyebrow">${escapeHtml(profile.roleGroup)} comparison</p>
        <h2>${escapeHtml(profile.name)}</h2>
        <p><span class="range">${forecast.range} chance range</span></p>
        <p>${synopsis}</p>
        <div class="badge-list">
          <span class="badge">${escapeHtml(profile.position || "MLB")}</span>
          <span class="badge">${profile.active ? "Active" : "Inactive"}</span>
          <span class="badge">${forecast.baselineCount} ${escapeHtml(forecast.baselineLabel || "Hall peers")}</span>
        </div>
      </div>
    </div>
    <div class="stat-grid">
      ${relevantStats.map(([label, value]) => `<div class="stat-tile"><b>${escapeHtml(String(value ?? ""))}</b><span>${label}</span></div>`).join("")}
    </div>
    ${ballotHistoryHtml(profile)}
    <p class="source-note">Stat tiles show current career totals from MLB Stats API as of ${escapeHtml(today)}. Projection is used only for the Hall probability model.</p>
  `;
}

function ballotHistoryHtml(profile) {
  if (profile.active || !profile.ballotHistory?.length) return "";
  const rows = profile.ballotHistory
    .slice()
    .sort((a, b) => b.year - a.year)
    .map((row) => `
      <div class="ballot-row">
        <span>${escapeHtml(String(row.year))}</span>
        <span>${escapeHtml(row.body)}</span>
        <span>${escapeHtml(ballotVoteText(row))}</span>
      </div>
    `).join("");
  return `
    <div class="ballot-history">
      <h3>Ballot History</h3>
      <div class="ballot-row ballot-header"><span>Year</span><span>Ballot</span><span>Votes</span></div>
      ${rows}
    </div>
  `;
}

function ballotVoteText(row) {
  const needed = row.needed ? `, ${row.needed} needed` : "";
  if (row.votes !== null && row.votes !== undefined && row.ballots) {
    const pct = row.pct !== null && row.pct !== undefined ? `, ${row.pct}%` : "";
    return `${row.votes}/${row.ballots}${pct}${needed}`;
  }
  if (row.neededNote && row.ballots) return `${row.neededNote} of ${row.ballots} ballots${needed}`;
  if (row.neededNote) return row.neededNote;
  if (row.ballots) return `Vote total not disclosed; ${row.ballots} ballots${needed}`;
  return "Vote total not available";
}

function buildSynopsis(profile, forecast) {
  const context = playerContextNote(profile.name);
  const contextSentence = context ? ` ${context}` : "";
  const ballotSentence = ballotRealitySentence(profile);
  const activeReality = activeCareerRealitySentence(profile);
  if (profile.isHallOfFamer) {
    const hall = profile.hallInfo;
    return `${profile.name} is already inducted into the National Baseball Hall of Fame, so the induction probability is locked at 100%. The player was inducted in ${hall.inductedYear} via ${hall.method}; the stat tiles below still show current career totals from the live MLB lookup when available.${contextSentence}`;
  }
  if (forecast.score <= 10) {
    const lowScorePath = profile.active
      ? "so the path would likely require a major late-career push or unusually strong committee support."
      : "so the path would likely require unusually strong Era Committee support or a major shift in historical evaluation.";
    return `${profile.name}'s statistical case sits below the usual Hall peer median for this role, ${lowScorePath}${activeReality}${ballotSentence}${contextSentence}`;
  }

  const current = profile.current;
  const projected = profile.projected;
  const strengths = forecast.parts.filter((p) => p.good).map((p) => p.label).slice(0, 3);
  const role = profile.roleGroup === "Position Player"
    ? "position-player"
    : profile.roleGroup === "Relief Pitcher"
      ? "relief-pitcher"
      : "starting-pitcher";
  const currentLine = currentStatSentence(profile, current);
  const projectionLine = projectionSentence(profile, current, projected);
  const path = forecast.score >= 75
    ? "That puts the profile in clear BBWAA territory if the career shape holds and there are no major ballot-context penalties."
    : forecast.score >= 45
      ? "That is a real Hall conversation, but the final path may depend on milestones, awards, postseason memory, and how crowded the ballot is when eligibility arrives."
      : profile.active
        ? "That is more of a borderline case, where Era Committee support or a very strong late-career finish would probably matter more than first-ballot momentum."
        : "That is more of a borderline case, where Era Committee support, ballot history, and historical reassessment would probably matter more than first-ballot momentum.";
  const peerLabel = forecast.baselineLabel || `Hall ${role} peers`;
  const driver = strengths.length
    ? `The model's strongest positive signals are ${strengths.join(", ")} against ${forecast.baselineCount} ${peerLabel}.`
    : `The model sees some value accumulation, but few categories are clearly above the weighted median for ${forecast.baselineCount} ${peerLabel}.`;

  return [currentLine, projectionLine, driver, `${path}${activeReality}${ballotSentence}${contextSentence}`].filter(Boolean).join(" ");
}

function activeCareerRealitySentence(profile) {
  if (!profile.active || profile.isHallOfFamer) return "";
  const stats = profile.current || {};
  const seasons = Math.max(1, profile.seasons || 1);
  const war = Number(stats.bWAR || 0);
  const warPace = war / seasons;
  const ops = (stats.OBP || 0) + (stats.SLG || 0);
  if (isHistoricActiveStart(profile, stats, warPace, ops)) return "";
  if (profile.roleGroup === "Position Player" && war < 25 && stats.H < 1200 && stats.HR < 180 && stats.G < 1100) {
    return " The model is conservative because the current career totals are still light and the early-career pace is not yet historic.";
  }
  if (profile.roleGroup === "Relief Pitcher" && war < 20 && stats.SV < 260 && stats.G < 520) {
    return " The model is conservative because the current relief resume is still short of the workload and save totals that usually drive Hall momentum.";
  }
  if (profile.roleGroup === "Starting Pitcher" && war < 25 && stats.W < 120 && stats.G < 280) {
    return " The model is conservative because the current starting-pitcher resume is still short of the workload and value base that usually precede Hall momentum.";
  }
  return "";
}

function ballotRealitySentence(profile) {
  if (profile.isHallOfFamer || profile.active || !profile.finalYear) return "";
  if (profile.finalYear > new Date().getFullYear() - 6) return "";
  const war = Number(profile.careerWarForCap ?? profile.current?.bWAR ?? profile.projected?.bWAR ?? 0);
  const warThreshold = profile.roleGroup === "Relief Pitcher" ? 20 : 40;
  if (war > warThreshold) return "";
  const ballot = profile.bbwAA || {};
  const appearances = Number(ballot.appearances || 0);
  const maxPct = Number(ballot.maxPct || 0);
  if (appearances === 0) return " The model sharply lowers the odds because the player has been retired more than five years and has not appeared on a BBWAA writers ballot.";
  if (maxPct <= 1) return " The model sharply lowers the odds because the player has been retired more than five years and never received more than 1% BBWAA support.";
  if (maxPct < 5) return ` The model caps the odds because the player peaked at ${maxPct.toFixed(1)}% BBWAA support and fell well short of staying on the ballot.`;
  return "";
}

function currentStatSentence(profile, stats) {
  if (profile.roleGroup === "Position Player") {
    const ops = ((stats.OBP || 0) + (stats.SLG || 0)).toFixed(3).replace(/^0/, "");
    return `${profile.name} currently owns ${fmt(stats.H)} hits, ${fmt(stats.HR)} home runs, ${fmt(stats.bWAR, 1)} bWAR, ${fmt(stats.fWAR, 1)} fWAR, a ${fmt(stats.OBP, "OBP")} OBP, a ${fmt(stats.SLG, "SLG")} slugging mark, and a ${ops} OPS.`;
  }
  if (profile.roleGroup === "Relief Pitcher") {
    return `${profile.name} currently has ${fmt(stats.SV)} saves, ${fmt(stats.bWAR, 1)} bWAR, ${fmt(stats.fWAR, 1)} fWAR, a ${stats.ERA || ""} ERA, and ${stats.K9 || ""} strikeouts per nine.`;
  }
  return `${profile.name} currently has ${fmt(stats.W)} wins, ${fmt(stats.bWAR, 1)} bWAR, ${fmt(stats.fWAR, 1)} fWAR, a ${stats.ERA || ""} ERA, and ${stats.K9 || ""} strikeouts per nine.`;
}

function projectionSentence(profile, current, projected) {
  if (!profile.active) return "";
  if (profile.roleGroup === "Position Player") {
    return `The displayed stats are current career totals, while the probability model projects a possible finish around ${fmt(projected.H)} hits and ${fmt(projected.HR)} home runs based on age and career pace.`;
  }
  if (profile.roleGroup === "Relief Pitcher") {
    return `The displayed stats are current career totals, while the probability model projects a possible finish around ${fmt(projected.SV)} saves with the current run-prevention profile.`;
  }
  return `The displayed stats are current career totals, while the probability model projects a possible finish around ${fmt(projected.W)} wins with the current run-prevention profile.`;
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rate(value) {
  if (value === undefined || value === null || value === "-.--") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

els.searchBtn.addEventListener("click", analyzePlayer);
els.playerSearch.addEventListener("input", debounce(updatePlayerSuggestions));
els.playerSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") analyzePlayer();
});
els.playerSuggestions.addEventListener("mousedown", (event) => {
  const item = event.target.closest(".suggestion-item");
  if (!item) return;
  event.preventDefault();
  els.playerSearch.value = item.dataset.name;
  renderPlayerSuggestions([]);
  analyzePlayer();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-block")) renderPlayerSuggestions([]);
});
els.questionBtn.addEventListener("click", answerQuestion);
els.questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") answerQuestion();
});

initFilters();
renderTable();
