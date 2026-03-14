async function loadReports() {
  try {
    const url = "https://api.github.com/repos/JWYOUN-1220/japan-battery-intelligence/contents/reports";
    const response = await fetch(url);
    const data = await response.json();

    const list = document.getElementById("report-list");
    if (!list) return;

    if (!Array.isArray(data)) {
      list.innerHTML = "<li>리포트 목록을 불러오지 못했습니다.</li>";
      console.error("Unexpected reports API response:", data);
      return;
    }

    data
      .filter(file => file.name.endsWith(".html"))
      .sort((a, b) => b.name.localeCompare(a.name))
      .forEach(file => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = "reports/" + file.name;
        link.textContent = file.name.replace(".html", "");
        li.appendChild(link);
        list.appendChild(li);
      });

    if (list.children.length === 0) {
      list.innerHTML = "<li>아직 업로드된 리포트가 없습니다.</li>";
    }
  } catch (error) {
    const list = document.getElementById("report-list");
    if (list) list.innerHTML = "<li>리포트 목록을 불러오지 못했습니다.</li>";
    console.error(error);
  }
}

async function loadRecentChanges() {
  try {
    const response = await fetch("data/network.json");
    const data = await response.json();

    const list = document.getElementById("change-list");
    if (!list) return;

    if (!data.links || !Array.isArray(data.links)) {
      list.innerHTML = "<li>공급망 데이터를 불러오지 못했습니다.</li>";
      return;
    }

    const recentLinks = data.links.slice(-8).reverse();

    recentLinks.forEach(link => {
      const li = document.createElement("li");
      li.textContent = `${link.source} → ${link.target} (${link.type})`;
      list.appendChild(li);
    });

    if (recentLinks.length === 0) {
      list.innerHTML = "<li>표시할 공급망 변화가 없습니다.</li>";
    }
  } catch (error) {
    const list = document.getElementById("change-list");
    if (list) list.innerHTML = "<li>공급망 데이터를 불러오지 못했습니다.</li>";
    console.error(error);
  }
}

loadReports();
loadRecentChanges();
