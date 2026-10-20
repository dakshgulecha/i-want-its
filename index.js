let pendingId = null;
let allUsers = [];

function renderUsers(users) {
  allUsers = users;
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

function openConfirm() {
  $("confirm-fields").replaceChildren(
    ...allUsers.map((u) => {
      const input = document.createElement("input");
      input.type = "password";
      input.placeholder = `${u.name}'s password`;
      input.autocomplete = "new-password";
      input.required = true;
      input.dataset.id = u.id;
      return input;
    })
  );
  showError("confirm-error", "");
  $("confirm-dialog").showModal();
}

$("create-form").onsubmit = (e) => {
  e.preventDefault();
  showError("form-error", "");
  openConfirm();
};

$("confirm-form").onsubmit = async (e) => {
  e.preventDefault();
  const passwords = Object.fromEntries(
    [...$("confirm-fields").children].map((input) => [input.dataset.id, input.value])
  );
  try {
    await call("create_iou", {
      p_device_type: $("device-type").value,
      p_owner_id: $("owner").value,
      p_passwords: passwords
    });
    $("confirm-dialog").close();
    $("device-type").value = "";
    await load();
  } catch (err) {
    showError("confirm-error", err.message);
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
