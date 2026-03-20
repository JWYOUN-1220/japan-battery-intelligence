let allReports = [];
let filteredReports = [];
let currentPage = 1;
const perPage = 10;

async function loadReports() {
  try {
    const url = "https://api.github.com/repos/JWYOUN-1220/japan-battery-intelligence/contents/reports";
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected reports API response");
    }

    allReports = data
      .filter(file => file.name.endsWith(".html"))
      .sort((a, b) => b.name.localeCompare(a.name));

    filteredReports = [...allReports];

    renderLatestReports();
    renderReports();
  } catch (error) {
    const latestList = document.getElementById("latest-report-list");
    const reportList = document.getElementById("report-list");

    if (latestList) latestList.innerHTML = "<li>최신 리포트를 불러오지 못했습니다.</li>";
    if (reportList) reportList.innerHTML = "<li>리포트 목록을 불러오지 못했습니다.</li>";

    console.error(error);
  }
}

function renderLatestReports() {
  const latestList = document.getElementById("latest-report-list");
  if (!latestList) return;

  latestList.innerHTML = "";

  allReports.slice(0, 5).forEach(file => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = "reports/" + file.name;
    link.textContent = file.name.replace(".html", "");
    li.appendChild(link);
    latestList.appendChild(li);
  });

  if (latestList.children.length === 0) {
    latestList.innerHTML = "<li>업로드된 리포트가 없습니다.</li>";
  }
}

function renderReports() {
  const list = document.getElementById("report-list");
  const pageInfo = document.getElementById("pageInfo");
  if (!list) return;

  list.innerHTML = "";

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / perPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageReports = filteredReports.slice(start, end);

  pageReports.forEach(file => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = "reports/" + file.name;
    link.textContent = file.name.replace(".html", "");
    li.appendChild(link);
    list.appendChild(li);
  });

  if (pageReports.length === 0) {
    list.innerHTML = "<li>검색 결과가 없습니다.</li>";
  }

  if (pageInfo) {
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
  }
}

function setupPagination() {
  const nextBtn = document.getElementById("next");
  const prevBtn = document.getElementById("prev");

  if (nextBtn) {
    nextBtn.onclick = () => {
      const totalPages = Math.ceil(filteredReports.length / perPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderReports();
      }
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderReports();
      }
    };
  }
}

function setupSearch() {
  const input = document.getElementById("reportSearch");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const keyword = e.target.value.trim().toLowerCase();

    filteredReports = allReports.filter(r =>
      r.name.toLowerCase().includes(keyword)
    );

    currentPage = 1;
    renderReports();
  });
}

async function loadRecentChanges() {
  try {
    const response = await fetch("data/network.json");
    const data = await response.json();

    const changeList = document.getElementById("change-list");
    const keywordList = document.getElementById("keyword-list");

    if (!changeList || !keywordList) return;

    changeList.innerHTML = "";
    keywordList.innerHTML = "";

    if (!data.links || !Array.isArray(data.links)) {
      changeList.innerHTML = "<li>공급망 데이터를 불러오지 못했습니다.</li>";
      return;
    }

    const recentLinks = [...data.links]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);

    const keywordSet = new Set();

    recentLinks.forEach(link => {
      const li = document.createElement("li");

      const wrapper = document.createElement("div");
      wrapper.className = "signal-item";

      const badge = document.createElement("span");
      badge.className = "signal-badge";

      const strength = link.strength || "보통";
      if (strength === "높음") {
        badge.classList.add("signal-high");
      } else if (strength === "낮음") {
        badge.classList.add("signal-low");
      } else {
        badge.classList.add("signal-medium");
      }
      badge.textContent = strength;

      const text = document.createElement("div");
      text.className = "signal-text";

      const date = link.date ? `${link.date} | ` : "";
      const note = link.note ? ` - ${link.note}` : "";

      text.textContent = `${date}${link.source} → ${link.target} (${link.type})${note}`;

      wrapper.appendChild(badge);
      wrapper.appendChild(text);
      li.appendChild(wrapper);
      changeList.appendChild(li);

      keywordSet.add(link.source);
      keywordSet.add(link.target);
    });

    Array.from(keywordSet).slice(0, 8).forEach(keyword => {
      const chip = document.createElement("span");
      chip.className = "keyword-chip";
      chip.textContent = keyword;
      keywordList.appendChild(chip);
    });

    if (recentLinks.length === 0) {
      changeList.innerHTML = "<li>표시할 공급망 변화가 없습니다.</li>";
    }
  } catch (error) {
    const changeList = document.getElementById("change-list");
    if (changeList) {
      changeList.innerHTML = "<li>공급망 데이터를 불러오지 못했습니다.</li>";
    }
    console.error(error);
  }
}

setupPagination();
setupSearch();
loadReports();
loadRecentChanges();
