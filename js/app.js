import { api } from "./api.js";
import { startIncidents, clearIncidents, showIncidentPanel } from "./incidents.js";
import { startAdmin, clearAdmin, loadUsers, loadAudit, verifyAudit, submitCreateUser, submitPassword, submitResetPassword, closeReset } from "./admin.js";

const $ = id => document.getElementById(id);
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
  screen("app");
  const onExpired = () => showLogin("Your session expired. Please sign in again.");
  startAdmin({ user, onExpired });
  startIncidents({ user, onExpired });
}
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
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
  try {
    await api("/auth/logout", { method: "POST" });
    showLogin();
  } catch (e) {
    if (e.status === 401) showLogin();
    else $("globalMessage").textContent = "Logout could not be confirmed. Please retry.";
  }
});
async function initialize() {
  screen("loading");
  try {
    showApp(await api("/auth/me"));
  } catch (e) {
    showLogin(e.status === 401 ? "" : "The service is unavailable right now. Please try again later.");
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
$("resetPasswordForm").addEventListener("submit", submitResetPassword);
$("cancelReset").addEventListener("click", closeReset);
initialize();
