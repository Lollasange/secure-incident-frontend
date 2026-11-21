import { api } from "./api.js";
const $ = id => document.getElementById(id);
const STATUS_LABEL = { open: "Open", under_review: "Under review", closed: "Closed" };
const sample = [
  { id: 101, title: "Lost access badge", description: "A test badge was reported missing near the lobby. Sample incident only.", status: "open", version: 1, created_by: "sample_user", created_at: "2026-11-19T16:15:00Z", updated_at: "2026-11-19T16:15:00Z" },
  { id: 102, title: "Suspicious email reported", description: "Employee reported a suspicious test email. Sample data only.", status: "under_review", version: 2, created_by: "sample_user", created_at: "2026-11-18T14:30:00Z", updated_at: "2026-11-19T09:00:00Z" },
  { id: 103, title: "Door left unsecured", description: "Sample closed incident.", status: "closed", version: 3, created_by: "sample_user", created_at: "2026-11-16T10:00:00Z", updated_at: "2026-11-17T10:00:00Z" }
];
const sampleComments = [{ id: 1, author: "sample_reviewer", body: "We are reviewing the report. Sample comment only.", created_at: "2026-11-19T09:15:00Z" }];
let role = "user";
let demo = false;
let expired = () => {};
let selected = null;
let generation = 0;
let wired = false;
const dateText = value => value ? new Date(value).toLocaleString() : "—";
const statusText = value => STATUS_LABEL[value] || value;
function notice(message, target = "globalMessage") { $(target).textContent = message; }
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = String(text);
  if (className) el.className = className;
  return el;
}
function show(which) {
  for (const name of ["list", "create", "detail"]) $(name + "Panel").hidden = which !== name;
  $("showList").setAttribute("aria-current", which === "list" ? "page" : "false");
  $("showCreate").setAttribute("aria-current", which === "create" ? "page" : "false");
}
async function request(path, opts) {
  try { return await api(path, opts); }
  catch (e) { if (e.status === 401) expired(); throw e; }
}
function accessibleDemoIncidents() {
  if (role === "user") return sample.filter(x => x.created_by === "sample_user");
  if (role === "reviewer") return sample.filter(x => x.status !== "closed" || x.created_by === "sample_reviewer");
  return sample;
}
async function loadList() {
  const token = generation;
  notice("", "globalMessage");
  notice("Loading incidents…", "listMessage");
  $("incidentRows").replaceChildren();
  const filter = $("statusFilter").value;
  try {
    const list = demo
      ? accessibleDemoIncidents().filter(item => !filter || item.status === filter)
      : await request("/incidents" + (filter ? "?status=" + encodeURIComponent(filter) : ""));
    if (token !== generation) return;
    for (const item of list) {
      const row = element("tr");
      for (const value of [item.id, item.title, statusText(item.status), item.created_by, dateText(item.created_at)]) {
        row.append(element("td", value));
      }
      const action = element("td");
      const button = element("button", "View details", "secondary small-button");
      button.type = "button";
      button.addEventListener("click", () => loadDetail(item.id));
      action.append(button);
      row.append(action);
      $("incidentRows").append(row);
    }
    notice(list.length ? `${list.length} incident(s) shown.` : "No incidents found.", "listMessage");
  } catch (e) {
    if (token === generation && e.status !== 401) notice(e.message, "listMessage");
  }
}
function renderComments(comments) {
  $("commentList").replaceChildren();
  if (!comments.length) { $("commentList").append(element("p", "No comments yet.", "muted")); return; }
  for (const comment of comments) {
    const article = element("article", undefined, "comment");
    article.append(element("strong", comment.author + " · " + dateText(comment.created_at)));
    article.append(element("p", comment.body, "preserve-lines"));
    $("commentList").append(article);
  }
}
async function loadDetail(id) {
  const token = generation;
  notice("Loading incident details…");
  try {
    const result = demo
      ? { incident: accessibleDemoIncidents().find(item => item.id === id), comments: id === 102 ? sampleComments : [] }
      : await request("/incidents/" + encodeURIComponent(id));
    if (token !== generation) return;
    if (!result.incident) throw new Error("Incident not found.");
    selected = result.incident;
    $("detailHeading").textContent = `Incident #${selected.id}: ${selected.title}`;
    $("detailStatus").textContent = statusText(selected.status);
    $("detailReporter").textContent = selected.created_by;
    $("detailCreated").textContent = dateText(selected.created_at);
    $("detailUpdated").textContent = dateText(selected.updated_at);
    $("detailDescription").textContent = selected.description;
    $("statusSelect").value = selected.status;
    $("statusForm").hidden = role !== "reviewer";
    $("commentForm").hidden = !["reviewer", "admin"].includes(role);
    $("statusSelect").disabled = demo;
    $("statusForm").querySelector("button").disabled = demo;
    $("commentBody").disabled = demo;
    $("commentForm").querySelector("button").disabled = demo;
    notice(demo ? "Preview only: status changes and comments are disabled." : "", "statusMessage");
    notice("", "commentMessage");
    renderComments(result.comments || []);
    notice("");
    show("detail");
  } catch (e) {
    if (token !== generation || e.status === 401) return;
    notice(e.status === 404 ? "Incident not found or not accessible." : e.message);
    if (e.status === 404) { show("list"); await loadList(); }
  }
}
async function submitCreate(event) {
  event.preventDefault();
  if (demo) { notice("Preview only. No incident was submitted.", "createMessage"); return; }
  const title = $("incidentTitle").value.trim();
  const description = $("incidentDescription").value.trim();
  if (!title || !description) { notice("Title and description are required.", "createMessage"); return; }
  const button = $("submitIncident"); button.disabled = true;
  try {
    const result = await request("/incidents", { method: "POST", body: { title, description } });
    $("createForm").reset();
    notice("Incident submitted successfully.");
    await loadList();
    if (result && Number.isInteger(result.id)) await loadDetail(result.id);
    else show("list");
  } catch (e) { if (e.status !== 401) notice(e.message, "createMessage"); }
  finally { button.disabled = false; }
}
async function submitStatus(event) {
  event.preventDefault();
  if (demo || role !== "reviewer" || !selected) return;
  const id = selected.id;
  try {
    await request(`/incidents/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status: $("statusSelect").value, version: selected.version } });
    await loadDetail(id);
    notice("Status updated successfully.");
  } catch (e) {
    if (e.status === 409) { await loadDetail(id); notice("Another reviewer updated this incident. Review the latest status and try again.", "statusMessage"); }
    else if (e.status !== 401) notice(e.message, "statusMessage");
  }
}
async function submitComment(event) {
  event.preventDefault();
  if (demo || !["reviewer", "admin"].includes(role) || !selected) return;
  const body = $("commentBody").value.trim();
  if (!body) { notice("Comment cannot be empty.", "commentMessage"); return; }
  const id = selected.id;
  try {
    await request(`/incidents/${encodeURIComponent(id)}/comments`, { method: "POST", body: { body } });
    $("commentBody").value = "";
    await loadDetail(id);
    notice("Comment posted successfully.", "commentMessage");
  } catch (e) { if (e.status !== 401) notice(e.message, "commentMessage"); }
}
function wireOnce() {
  if (wired) return;
  wired = true;
  $("showList").addEventListener("click", () => { show("list"); loadList(); });
  $("showCreate").addEventListener("click", () => { notice("", "createMessage"); show("create"); });
  $("backToList").addEventListener("click", () => { show("list"); loadList(); });
  $("refreshList").addEventListener("click", loadList);
  $("statusFilter").addEventListener("change", loadList);
  $("createForm").addEventListener("submit", submitCreate);
  $("statusForm").addEventListener("submit", submitStatus);
  $("commentForm").addEventListener("submit", submitComment);
}
export function clearIncidents() {
  generation++;
  selected = null;
  $("incidentRows").replaceChildren();
  $("commentList").replaceChildren();
  $("createForm").reset();
  $("commentForm").reset();
  notice("");
}
export function startIncidents({ user, demo: preview, onExpired }) {
  generation++;
  role = user.role;
  demo = preview;
  expired = onExpired;
  selected = null;
  $("statusFilter").value = "";
  $("incidentTitle").disabled = demo;
  $("incidentDescription").disabled = demo;
  $("submitIncident").disabled = demo;
  notice(demo ? "Preview only: creating incidents is disabled." : "", "createMessage");
  wireOnce();
  show("list");
  loadList();
}
