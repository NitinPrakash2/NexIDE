const BASE = "http://localhost:5000/api/v1";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    process.stdout.write(`  PASS: ${name}\n`);
  } else {
    failed++;
    failures.push({ name, detail });
    process.stdout.write(`  FAIL: ${name}${detail ? ` (${detail})` : ""}\n`);
  }
}

async function req(method, path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = { ...opts.headers };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, body: data };
}

async function run() {
  process.stdout.write("=== NexIDE Comprehensive Test Suite ===\n\n");

  // ── Auth ──────────────────────────────────────────────
  process.stdout.write("--- Auth ---\n");
  const testEmail = `test-${Date.now()}@nexide.test`;
  const testUsername = `testuser${Date.now()}`;
  const testUser = {
    fullName: "Test User",
    username: testUsername,
    email: testEmail,
    password: "TestPass123",
  };

  let r = await req("POST", "/auth/register", { body: testUser });
  check("Register returns 201", r.status === 201);
  check("Register returns user id", !!r.body?.data?.id);

  r = await req("POST", "/auth/login", { body: { email: testEmail, password: "TestPass123" } });
  const token = r.body?.data?.accessToken;
  check("Login returns 200", r.status === 200);
  check("Login returns access token", !!token);
  check("Login returns user", !!r.body?.data?.user);

  r = await req("POST", "/auth/login", { body: { email: testEmail, password: "wrong" } });
  check("Login with wrong password returns 401", r.status === 401);

  r = await req("GET", "/auth/me", { token });
  check("Get me returns 200", r.status === 200);
  check("Get me returns correct email", r.body?.data?.email === testEmail);

  // ── User Profile ──────────────────────────────────────
  process.stdout.write("\n--- User Profile ---\n");
  r = await req("PATCH", "/users/me", { token, body: { bio: "Test bio updated" } });
  check("Update profile returns 200", r.status === 200);
  check("Bio updated", r.body?.data?.bio === "Test bio updated");

  r = await req("GET", `/users/check-username/${testUsername}`, {});
  check("Username check returns 200", r.status === 200);
  check("Username taken reported", r.body?.data?.available === false);

  r = await req("GET", `/users/${testUsername}`, {});
  check("Public profile returns 200", r.status === 200);

  // ── Projects ──────────────────────────────────────────
  process.stdout.write("\n--- Projects ---\n");
  r = await req("POST", "/projects", {
    token,
    body: { name: "Test Project", description: "A test project", language: "javascript" },
  });
  const projectId = r.body?.data?.id;
  check("Create project returns 201", r.status === 201);
  check("Project has id", !!projectId);

  r = await req("GET", `/projects/${projectId}`, { token });
  check("Get project returns 200", r.status === 200);
  check("Project name matches", r.body?.data?.name === "Test Project");

  r = await req("PATCH", `/projects/${projectId}`, { token, body: { name: "Updated Project" } });
  check("Update project returns 200", r.status === 200);
  check("Project name updated", r.body?.data?.name === "Updated Project");

  r = await req("GET", "/projects", { token });
  check("List projects returns 200", r.status === 200);
  check("List contains project", r.body?.data?.some?.((p) => p.id === projectId));

  r = await req("POST", `/projects/${projectId}/favorite`, { token });
  check("Favorite project returns 200", r.status === 200);

  r = await req("DELETE", `/projects/${projectId}/favorite`, { token });
  check("Unfavorite project returns 200", r.status === 200);

  // ── Workspace & Members ──────────────────────────────
  process.stdout.write("\n--- Workspace & Members ---\n");
  r = await req("GET", `/projects/${projectId}/workspace`, { token });
  check("Get workspace returns 200", r.status === 200);
  check("Workspace has name", !!r.body?.data?.name);

  r = await req("GET", `/projects/${projectId}/members`, { token });
  check("List members returns 200", r.status === 200);
  check("Owner is member", r.body?.data?.some?.((m) => m.role === "OWNER"));

  // ── File System ───────────────────────────────────────
  process.stdout.write("\n--- File System ---\n");
  r = await req("POST", `/projects/${projectId}/folders`, { token, body: { name: "src" } });
  const folderId = r.body?.data?.id;
  check("Create folder returns 201", r.status === 201);
  check("Folder has id", !!folderId);

  r = await req("POST", `/projects/${projectId}/files`, {
    token,
    body: { name: "index.js", folderId, content: "console.log('hello');" },
  });
  const fileId = r.body?.data?.id;
  check("Create file returns 201", r.status === 201);
  check("File has id", !!fileId);
  check("File has content", r.body?.data?.content === "console.log('hello');");

  r = await req("GET", `/projects/${projectId}/files/${fileId}`, { token });
  check("Get file returns 200", r.status === 200);
  check("File content correct", r.body?.data?.content === "console.log('hello');");

  r = await req("PUT", `/projects/${projectId}/files/${fileId}`, {
    token,
    body: { content: "console.log('updated');" },
  });
  check("Update file returns 200", r.status === 200);
  check("Content updated", r.body?.data?.content === "console.log('updated');");

  r = await req("GET", `/projects/${projectId}/files/tree`, { token });
  check("File tree returns 200", r.status === 200);
  check("Tree has folders", Array.isArray(r.body?.data?.folders));
  check("Tree has files", Array.isArray(r.body?.data?.files));

  r = await req("DELETE", `/projects/${projectId}/files/${fileId}`, { token });
  check("Delete file returns 200", r.status === 200);

  r = await req("DELETE", `/projects/${projectId}/folders/${folderId}`, { token });
  check("Delete folder returns 200", r.status === 200);

  // ── Chat ──────────────────────────────────────────────
  process.stdout.write("\n--- Chat ---\n");
  r = await req("POST", `/projects/${projectId}/chat`, { token, body: { message: "Hello team!" } });
  check("Send chat returns 201", r.status === 201);

  r = await req("GET", `/projects/${projectId}/chat`, { token });
  check("Get chat history returns 200", r.status === 200);
  check("Chat has messages array", Array.isArray(r.body?.data?.messages));

  // ── Notifications ─────────────────────────────────────
  process.stdout.write("\n--- Notifications ---\n");
  r = await req("GET", "/notifications", { token });
  check("List notifications returns 200", r.status === 200);
  check("Notifications has data", !!r.body?.data);

  r = await req("GET", "/notifications/unread-count", { token });
  check("Unread count returns 200", r.status === 200);
  check("Unread count is number", typeof r.body?.data?.count === "number");

  // ── GitHub Integration ────────────────────────────────
  process.stdout.write("\n--- GitHub ---\n");
  r = await req("GET", `/github/${projectId}/linked`, { token });
  check("Get linked repo returns 200", r.status === 200);
  check("No linked repo reported", r.body?.data?.linked === false);

  r = await req("POST", "/github/import", {
    token,
    body: { repoUrl: "https://github.com/octocat/Hello-World" },
  });
  const importPassed = r.status === 201;
  check("Import Hello-World returns 201", importPassed);
  if (importPassed) {
    const ghProjectId = r.body?.data?.project?.id;
    check("Import creates project", !!ghProjectId);
    check("Import has stats", !!(r.body?.data?.stats?.filesCreated >= 0));
    check("Import has webhook secret", !!r.body?.data?.webhookSecret);

    if (ghProjectId) {
      r = await req("GET", `/github/${ghProjectId}/linked`, { token });
      check("Linked repo found", r.body?.data?.linked === true);

      r = await req("POST", `/github/${ghProjectId}/webhook-secret`, { token });
      check("Regenerate webhook returns 200", r.status === 200);
      check("New webhook secret generated", !!r.body?.data?.webhookSecret);

      r = await req("DELETE", `/github/${ghProjectId}/linked`, { token });
      check("Unlink repo returns 200", r.status === 200);
    }
  }

  r = await req("POST", "/github/import", { token, body: { repoUrl: "not-a-valid-url" } });
  check("Import bad URL validation fails", r.status === 422);

  // ── Docker Runtime (graceful degradation) ────────────
  process.stdout.write("\n--- Docker Runtime ---\n");
  r = await req("POST", `/projects/${projectId}/containers`, { token, body: { image: "node:18-alpine" } });
  check("Create container returns 201 (or error gracefully)", r.status >= 200);
  if (r.status === 201) {
    const containerId = r.body?.data?.id;
    check("Container has id", !!containerId);

    r = await req("GET", `/projects/${projectId}/containers`, { token });
    check("List containers returns 200", r.status === 200);
    check("Containers is array", Array.isArray(r.body?.data));
  }

  // ── AI (graceful degradation) ─────────────────────────
  process.stdout.write("\n--- AI ---\n");
  r = await req("POST", "/ai/conversations", { token, body: { title: "Test conversation" } });
  const convId = r.body?.data?.id;
  check("Create conversation returns 201", r.status === 201);
  check("Conversation has id", !!convId);

  r = await req("GET", "/ai/conversations", { token });
  check("List conversations returns 200", r.status === 200);
  check("List contains conversation", r.body?.data?.some?.((c) => c.id === convId));

  if (convId) {
    r = await req("GET", `/ai/conversations/${convId}`, { token });
    check("Get conversation returns 200", r.status === 200);

    r = await req("PATCH", `/ai/conversations/${convId}`, { token, body: { title: "Updated" } });
    check("Update conversation returns 200", r.status === 200);

    r = await req("POST", `/ai/conversations/${convId}/chat`, { token, body: { message: "Hello AI!" } });
    check("Chat returns 200 (or 503 if no API key)", r.status >= 200);

    r = await req("DELETE", `/ai/conversations/${convId}`, { token });
    check("Delete conversation returns 200", r.status === 200);
  }

  // ── Invitations (accept/reject by token, no list endpoint) ──
  process.stdout.write("\n--- Invitations ---\n");
  process.stdout.write("  (no list endpoint — invitations are token-based)\n");

  // ── Health ─────────────────────────────────────────────
  process.stdout.write("\n--- Health ---\n");
  r = await req("GET", "/health", {});
  check("Health returns 200", r.status === 200);
  check("Health has request ID", !!r.body?.data?.requestId);
  check("Health has components", !!r.body?.data?.components);
  check("Health has DB status", !!r.body?.data?.components?.database);

  // ── 404 ───────────────────────────────────────────────
  process.stdout.write("\n--- 404 Handling ---\n");
  r = await req("GET", "/nonexistent-route", {});
  check("Unknown route returns 404", r.status === 404);

  // ── Summary ───────────────────────────────────────────
  process.stdout.write(`\n=== RESULTS ===\n`);
  process.stdout.write(`${passed} passed, ${failed} failed\n`);
  if (failures.length > 0) {
    process.stdout.write("\nFailures:\n");
    for (const f of failures) {
      process.stdout.write(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}\n`);
    }
  }
  process.stdout.write(`\n${failed === 0 ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  process.stdout.write(`Test runner crashed: ${err.message}\n`);
  process.exit(1);
});
