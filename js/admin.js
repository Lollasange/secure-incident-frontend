//* Administrator and account screens. API integration requires HTTPS testing. */
import { api } from "./api.js";
const $ = id => document.getElementById(id);
let user = null;
let resetTarget = null;
let onExpired = () => {};
let generation = 0;
function node(tag, value, cls) {
  const el = document.createElement(tag);
  if (value !== undefined) el.textContent = String(value);
  if (cls) el.className = cls;
  return el;
}
function dateText(value) { return value ? new Date(value).toLocaleString() : "—"; }
function report(id, message, kind = "") {
  const el = $(id);
  el.textContent = message;
  el.classList.toggle("ok-message", kind === "ok");
  el.classList.toggle("bad-message", kind === "bad");
}
async function request(path, options) {
  try { return await api(path, options); }
  catch (e) { if (e.status === 401) onExpired(); throw e; }
}
function isAdmin() { return !!user && user.role === "admin"; }
/* Returns true when the update succeeded. */
async function modifyUser(id, changes) {
  if (!isAdmin()) return false;
  if (id === user.id) { report("usersMessage", "You cannot update your own account here.", "bad"); return false; }
  try {
    await request(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: changes });
    report("usersMessage", "Account updated successfully.", "ok");
    await loadUsers(true);
    return true;
  } catch (e) {
    if (e.status !== 401) report("usersMessage", e.message, "bad");
    return false;
  }
}
/* Password reset uses a masked form instead of window.prompt (which shows the password). */
function openReset(row) {
  resetTarget = row;
  $("resetPasswordForm").reset();
  $("resetHeading").textContent = `Reset password for ${row.username}`;
  report("resetPasswordMessage", "");
  $("resetPasswordForm").hidden = false;
  $("resetPassword").focus();
}
export function closeReset() {
  resetTarget = null;
  $("resetPasswordForm").reset();
  $("resetPasswordForm").hidden = true;
  report("resetPasswordMessage", "");
}
export async function submitResetPassword(event) {
  event.preventDefault();
  if (!isAdmin() || !resetTarget) return;
  const password = $("resetPassword").value;
  if (password.length < 12 || password.length > 128) return report("resetPasswordMessage", "Password must be 12–128 characters.", "bad");
  if (!window.confirm(`Reset ${resetTarget.username}'s password? They will be signed out everywhere.`)) return;
  const button = $("resetPasswordButton"); button.disabled = true;
  try {
    if (await modifyUser(resetTarget.id, { password })) closeReset();
  } finally { button.disabled = false; }
}
function actionsFor(row) {
  const cell = node("td");
  if (row.id === user.id) { cell.append(node("span", "Own account — no edits", "muted")); return cell; }
  const holder = node("div", undefined, "user-actions");
  const select = node("select");
  select.setAttribute("aria-label", `Role for ${row.username}`);
  for (const role of ["user", "reviewer", "admin"]) {
    const option = node("option", role);
    option.value = role;
    select.append(option);
  }
  select.value = row.role;
  const roleButton = node("button", "Save role", "secondary");
  roleButton.type = "button";
  roleButton.addEventListener("click", () => modifyUser(row.id, { role: select.value }));
  const activeButton = node("button", row.is_active ? "Deactivate" : "Reactivate", row.is_active ? "danger" : "secondary");
  activeButton.type = "button";
  activeButton.addEventListener("click", () => {
    if (window.confirm(`${row.is_active ? "Deactivate" : "Reactivate"} ${row.username}?`)) modifyUser(row.id, { is_active: !row.is_active });
  });
  const resetButton = node("button", "Reset password", "secondary");
  resetButton.type = "button";
  resetButton.addEventListener("click", () => openReset(row));
  holder.append(select, roleButton, activeButton, resetButton);
  cell.append(holder);
  return cell;
}
export async function loadUsers(keepMessage = false) {
  if (!isAdmin()) return;
  const token = generation;
  $("userRows").replaceChildren();
  if (!keepMessage) report("usersMessage", "Loading users…");
  try {
    const rows = await request("/admin/users");
    if (token !== generation) return;
    for (const row of rows) {
      const tr = node("tr");
      const locked = row.locked_until && new Date(row.locked_until).getTime() > Date.now() ? `Locked until ${dateText(row.locked_until)}` : "—";
      for (const value of [row.id, row.username, row.role, row.is_active ? "Active" : "Inactive", locked]) tr.append(node("td", value));
      tr.append(actionsFor(row));
      $("userRows").append(tr);
    }
    if (!keepMessage) report("usersMessage", `${rows.length} user(s) shown.`);
  } catch (e) { if (e.status !== 401) report("usersMessage", e.message, "bad"); }
}
export async function submitCreateUser(event) {
  event.preventDefault();
  if (!isAdmin() ) return;
  const username = $("createUsername").value.trim();
  const password = $("createUserPassword").value;
  const role = $("createUserRole").value;
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) return report("createUserMessage", "Username contains invalid characters or length.", "bad");
  if (password.length < 12 || password.length > 128) return report("createUserMessage", "Password must be 12–128 characters.", "bad");
  const button = $("createUserButton"); button.disabled = true;
  try {
    await request("/admin/users", { method: "POST", body: { username, password, role } });
    $("createUserForm").reset();
    report("createUserMessage", "User account created.", "ok");
    await loadUsers();
  } catch (e) { if (e.status !== 401) report("createUserMessage", e.message, "bad"); }
  finally { button.disabled = false; }
}
export async function loadAudit() {
  if (!isAdmin()) return;
  const token = generation;
  $("auditRows").replaceChildren();
  report("auditMessage", "Loading audit entries…");
  try {
    const entries = await request("/admin/audit?limit=200");
    if (token !== generation) return;
    for (const entry of entries) {
      const tr = node("tr");
      for (const value of [entry.id, dateText(entry.created_at), entry.username ?? "—", entry.action, `${entry.target_type}: ${entry.target_id ?? "—"}`, entry.hash?.slice(0, 8) ?? "—"]) tr.append(node("td", value));
      $("auditRows").append(tr);
    }
    report("auditMessage", `${entries.length} audit entr${entries.length === 1 ? "y" : "ies"} shown.`);
  } catch (e) { if (e.status !== 401) report("auditMessage", e.message, "bad"); }
}
export async function verifyAudit() {
  if (!isAdmin() ) return;
  try {
    report("auditVerifyResult", "Verifying audit integrity…");
    const result = await request("/admin/audit/verify");
    report("auditVerifyResult", result.valid
      ? `Audit log intact. ${result.rows_checked} rows checked.`
      : `Audit integrity FAILED. First bad entry: ${result.first_bad_id ?? "unknown"}.`, result.valid ? "ok" : "bad");
  } catch (e) { if (e.status !== 401) report("auditVerifyResult", e.message, "bad"); }
}
export async function submitPassword(event) {
  event.preventDefault();
  const current_password = $("currentPassword").value;
  const new_password = $("newPassword").value;
  if (new_password !== $("confirmPassword").value) return report("passwordMessage", "New passwords do not match.", "bad");
  if (new_password.length < 12 || new_password.length > 128) return report("passwordMessage", "New password must be 12–128 characters.", "bad");
  const button = $("changePasswordButton"); button.disabled = true;
  try {
    await request("/auth/password", { method: "POST", body: { current_password, new_password } });
    $("passwordForm").reset();
    report("passwordMessage", "Password updated. Your other sessions were signed out.", "ok");
  } catch (e) { if (e.status !== 401) report("passwordMessage", e.message, "bad"); }
  finally { button.disabled = false; }
}
export function clearAdmin() {
  generation++;
  user = null;
  $("userRows").replaceChildren();
  $("auditRows").replaceChildren();
  $("createUserForm").reset();
  $("passwordForm").reset();
  closeReset();
  for (const id of ["usersMessage", "createUserMessage", "auditMessage", "auditVerifyResult", "passwordMessage"]) report(id, "");
}
export function startAdmin({ user: currentUser, onExpired: expired }) {
  generation++;
  user = currentUser;
  onExpired = expired;
  $("showUsers").hidden = !isAdmin();
  $("showAudit").hidden = !isAdmin();
}
