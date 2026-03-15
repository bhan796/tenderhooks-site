function slugify(text) {
  return (text || "client")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "client";
}

function parseCsvList(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toYaml(data) {
  const lines = [];
  lines.push(`name: ${data.company_name}`);
  lines.push("regions:");
  data.regions.forEach((r) => lines.push(`  - ${r}`));
  lines.push("keywords:");
  data.keywords.forEach((k) => lines.push(`  - ${k}`));
  lines.push("exclude_keywords:");
  data.exclude_keywords.forEach((k) => lines.push(`  - ${k}`));
  lines.push("min_score: 20");
  lines.push("max_items_per_digest: 15");
  lines.push("delivery:");
  lines.push(`  channel: ${data.delivery_channel}`);
  lines.push(`  time_local: \"${data.digest_time}\"`);
  lines.push("meta:");
  lines.push(`  plan: \"${data.plan}\"`);
  lines.push(`  contact_name: \"${data.contact_name}\"`);
  lines.push(`  contact_email: \"${data.contact_email}\"`);
  lines.push(`  contract_size: \"${data.contract_size}\"`);
  return lines.join("\n") + "\n";
}

function toOpsBrief(data, yamlText) {
  return [
    `# Onboarding Handoff — ${data.company_name}`,
    "",
    `Submitted: ${data.submitted_at}`,
    `Plan: ${data.plan}`,
    `Contact: ${data.contact_name} <${data.contact_email}>`,
    `Delivery: ${data.delivery_channel} at ${data.digest_time}`,
    "",
    "## Next actions",
    "1) Save YAML into profiles/<client>.yaml",
    "2) Run .\\run_daily.ps1 --Profile profiles/<client>.yaml",
    "3) Confirm digest quality and reply to client within 2 hours",
    "",
    "## Generated profile YAML",
    "```yaml",
    yamlText.trim(),
    "```",
    "",
    "## Source intake JSON",
    "```json",
    JSON.stringify(data, null, 2),
    "```",
    "",
  ].join("\n");
}

function blobLink(content, filename, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  return { url, filename };
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    alert(`${label} copied.`);
  } catch {
    alert(`Could not copy ${label.toLowerCase()}.`);
  }
}

const form = document.getElementById("onboardingForm");
const result = document.getElementById("submissionResult");
const downloadJson = document.getElementById("downloadJson");
const downloadYaml = document.getElementById("downloadYaml");
const downloadOps = document.getElementById("downloadOps");
const emailDraft = document.getElementById("emailDraft");
const copyJson = document.getElementById("copyJson");
const copyYaml = document.getElementById("copyYaml");

const params = new URLSearchParams(window.location.search);
const plan = (params.get("plan") || "starter").toLowerCase();
const planInput = document.querySelector('input[name="plan"]');
if (planInput) {
  planInput.value = ["starter", "pro"].includes(plan) ? plan : "starter";
}

const saved = localStorage.getItem("tenderhooks_last_onboarding");
if (saved && !params.get("fresh")) {
  try {
    const snapshot = JSON.parse(saved);
    if (snapshot?.company_name && form) {
      form.company_name.value = snapshot.company_name || "";
      form.contact_name.value = snapshot.contact_name || "";
      form.contact_email.value = snapshot.contact_email || "";
      form.primary_services.value = snapshot.primary_services || "";
      form.keywords.value = (snapshot.keywords || []).join(", ");
      form.exclude_keywords.value = (snapshot.exclude_keywords || []).join(", ");
      form.website.value = snapshot.website || "";
      form.existing_portals.value = snapshot.existing_portals || "";
      form.notes.value = snapshot.notes || "";
    }
  } catch {
    // ignore invalid local storage
  }
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const regionValues = Array.from(document.querySelectorAll('input[name="regions"]:checked')).map((el) => el.value);
  if (regionValues.length === 0) {
    alert("Please choose at least one target region.");
    return;
  }

  const payload = {
    plan: String(fd.get("plan") || "starter"),
    company_name: String(fd.get("company_name") || "").trim(),
    contact_name: String(fd.get("contact_name") || "").trim(),
    contact_email: String(fd.get("contact_email") || "").trim(),
    website: String(fd.get("website") || "").trim(),
    delivery_channel: String(fd.get("delivery_channel") || "email"),
    digest_time: String(fd.get("digest_time") || "07:30"),
    primary_services: String(fd.get("primary_services") || "").trim(),
    regions: regionValues,
    keywords: parseCsvList(String(fd.get("keywords") || "")),
    exclude_keywords: parseCsvList(String(fd.get("exclude_keywords") || "")),
    contract_size: String(fd.get("contract_size") || "any"),
    existing_portals: String(fd.get("existing_portals") || "").trim(),
    notes: String(fd.get("notes") || "").trim(),
    submitted_at: new Date().toISOString(),
  };

  if (!payload.company_name || !payload.contact_name || !payload.contact_email || !payload.primary_services || payload.keywords.length === 0) {
    alert("Please fill in all required fields.");
    return;
  }

  localStorage.setItem("tenderhooks_last_onboarding", JSON.stringify(payload));

  const profileSlug = slugify(payload.company_name);
  const jsonText = JSON.stringify(payload, null, 2);
  const yamlText = toYaml(payload);
  const opsText = toOpsBrief(payload, yamlText);

  const jsonLink = blobLink(jsonText, `${profileSlug}-onboarding.json`, "application/json");
  const yamlLink = blobLink(yamlText, `${profileSlug}.yaml`, "text/yaml");
  const opsLink = blobLink(opsText, `${profileSlug}-ops-brief.md`, "text/markdown");

  downloadJson.href = jsonLink.url;
  downloadJson.download = jsonLink.filename;

  downloadYaml.href = yamlLink.url;
  downloadYaml.download = yamlLink.filename;

  if (downloadOps) {
    downloadOps.href = opsLink.url;
    downloadOps.download = opsLink.filename;
  }

  if (copyJson) {
    copyJson.onclick = () => copyText(jsonText, "JSON");
  }
  if (copyYaml) {
    copyYaml.onclick = () => copyText(yamlText, "YAML");
  }

  const subject = encodeURIComponent(`Tender Hooks onboarding — ${payload.company_name}`);
  const body = encodeURIComponent(`New onboarding submission:\n\n${jsonText}\n\nGenerated profile YAML:\n\n${yamlText}`);
  emailDraft.href = `mailto:hello@tenderhooks.com?subject=${subject}&body=${body}`;

  form.classList.add("hidden");
  result.classList.remove("hidden");
});
