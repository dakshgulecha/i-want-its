let pendingId = null;

function renderUsers(users) {
  const current = $("owner").value;
  const placeholder = new Option("Owner", "", true, true);
  placeholder.disabled = true;
  $("owner").replaceChildren(placeholder, ...users.map((u) => new Option(u.name, u.id)));
  if (users.some((u) => u.id === current)) $("owner").value = current;
}

function renderTypes(types) {
  $("device-types").replaceChildren(
    ...types.map((t) => {
      const option = document.createElement("option");
      option.value = t;
      return option;
    })
  );
}

function renderTable(rows) {
  $("empty").hidden = rows.length > 0;
  $("rows").replaceChildren(
    ...rows.map((r) => {
      const button = document.createElement("button");
      button.textContent = "Use";
      button.onclick = () => openUse(r);
      const actions = document.createElement("td");
      actions.className = "actions";
      actions.append(button);
      const tr = document.createElement("tr");
      tr.append(cell(r.device_type), cell(r.owner_name), cell(formatDate(r.created_at)), actions);
      return tr;
    })
  );
}

async function load() {
  const [users, types, ious] = await Promise.all([
    call("list_users"),
    call("list_device_types"),
    call("list_ious")
  ]);
  renderUsers(users);
  renderTypes(types);
  renderTable(ious);
}

function openUse(row) {
  pendingId = row.id;
  $("use-title").textContent = `Use ${row.device_type}`;
  $("use-sub").textContent = `Enter ${row.owner_name}'s password to continue.`;
  $("use-form").reset();
  showError("use-error", "");
  $("use-dialog").showModal();
}

$("create-form").onsubmit = async (e) => {
  e.preventDefault();
  showError("form-error", "");
  try {
    await call("create_iou", { p_device_type: $("device-type").value, p_owner_id: $("owner").value });
    $("device-type").value = "";
    await load();
  } catch (err) {
    showError("form-error", err.message);
  }
};

$("add-user-btn").onclick = () => {
  $("user-form").reset();
  showError("user-error", "");
  $("user-dialog").showModal();
};

$("user-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await call("add_user", { p_name: $("user-name").value, p_password: $("user-password").value });
    $("user-dialog").close();
    await load();
  } catch (err) {
    showError("user-error", err.message);
  }
};

$("use-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const ok = await call("use_iou", { p_id: pendingId, p_password: $("use-password").value });
    if (!ok) return showError("use-error", "Wrong password");
    $("use-dialog").close();
    await load();
  } catch (err) {
    showError("use-error", err.message);
  }
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) load().catch(() => {});
});

load().catch((err) => showError("form-error", err.message));
