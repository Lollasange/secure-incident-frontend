import { api } from "./api.js";
import { startIncidents, clearIncidents, showIncidentPanel } from "./incidents.js";
import { startAdmin, clearAdmin, loadUsers, loadAudit, verifyAudit, submitCreateUser, submitPassword } from "./admin.js";

const $ = id => document.getElementById(id);
const previewRole = new URLSearchParams(window.location.search).get("preview");
const demo = ["user", "reviewer", "admin"].includes(previewRole);
let currentUser = null;

function screen(which) {
  $("loadingScreen").hidden = which !== "loading";
  $("loginScreen").hidden = which !== "login";
  $("appScreen").hidden = which !== "app";
}
function showLogin(message = "") {
  currentUser = null;
  clearIncidents();
  clearAdmin();
  $("loginForm").reset();
  $("loginError").textContent = message;
  screen("login");
}
function showApp(user) {
  currentUser = user;
  $("currentUser").textContent = user.username;
  $("currentRole").textContent = user.role;
  $("previewNotice").hidden = !demo;
  $("logoutButton").textContent = demo ? "Exit Preview" : "Log Out";
  screen("app");
  const onExpired = () => showLogin("Your session expired. Please sign in again.");
  startAdmin({ user, demo, onExpired });
  startIncidents({ user, demo, onExpired });
}
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (demo) return;
  const button = $("loginButton");
  button.disabled = true;
  $("loginError").textContent = "";
  const username = $("username").value;
  const password = $("password").value;
  try {
    const user = await api("/auth/login", { method: "POST", body: { username, password } });
    $("loginForm").reset();
    showApp(user);
  } catch (e) {
    $("loginError").textContent = e.message;
  } finally {
    button.disabled = false;
  }
});
$("logoutButton").addEventListener("click", async () => {
  if (demo) { window.location.assign(window.location.pathname); return; }
  try {
    await api("/auth/logout", { method: "POST" });
    showLogin();
  } catch (e) {
    if (e.status === 401) showLogin();
    else $("globalMessage").textContent = "Logout could not be confirmed. Please retry.";
  }
});
async function initialize() {
  if (demo) {
    showApp({ id: 99, username: "sample_" + previewRole, role: previewRole });
    return;
  }
  screen("loading");
  try {
    showApp(await api("/auth/me"));
  } catch (e) {
    showLogin(e.status === 401 ? "" : "Backend unavailable on this server. For a UI preview, add ?preview=reviewer to the URL.");
  }
}
// Shared navigation: the incident module owns incident panels;
// the admin module owns user/audit/password behaviors.
$("showPassword").addEventListener("click", () => showIncidentPanel("password"));
$("showUsers").addEventListener("click", () => { showIncidentPanel("users"); loadUsers(); });
$("showAudit").addEventListener("click", () => { showIncidentPanel("audit"); loadAudit(); });
$("refreshUsers").addEventListener("click", loadUsers);
$("refreshAudit").addEventListener("click", loadAudit);
$("verifyAudit").addEventListener("click", verifyAudit);
$("createUserForm").addEventListener("submit", submitCreateUser);
$("passwordForm").addEventListener("submit", submitPassword);
initialize();
