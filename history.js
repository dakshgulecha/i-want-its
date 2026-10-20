function renderHistory(rows) {
  $("empty").hidden = rows.length > 0;
  $("rows").replaceChildren(
    ...rows.map((r) => {
      const tr = document.createElement("tr");
      tr.append(cell(r.device_type), cell(r.owner_name), cell(formatDate(r.created_at)), cell(formatDate(r.used_at)));
      return tr;
    })
  );
}

async function load() {
  renderHistory(await call("list_history"));
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load().catch(() => {});
});

load().catch((err) => showError("error", err.message));
