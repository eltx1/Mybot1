(() => {
  const token = localStorage.getItem('mybot_token') || '';
  const statusEl = document.getElementById('status');
  const llmInfoEl = document.getElementById('llmInfo');
  const listEl = document.getElementById('promptList');
  const titleEl = document.getElementById('editorTitle');
  const messageEl = document.getElementById('message');
  const versionsEl = document.getElementById('versions');
  const auditEl = document.getElementById('audit');
  const state = { prompts: [], selected: null };

  async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function setMessage(text, ok = true) {
    messageEl.textContent = text;
    messageEl.className = ok ? 'ok' : 'err';
  }

  function readForm() {
    return {
      systemPrompt: document.getElementById('systemPrompt').value,
      userPrompt: document.getElementById('userPrompt').value,
      variables: JSON.parse(document.getElementById('variables').value || '[]'),
      settings: JSON.parse(document.getElementById('settings').value || '{}'),
      notes: document.getElementById('notes').value || ''
    };
  }

  function fillForm(version) {
    document.getElementById('systemPrompt').value = version?.systemPrompt || '';
    document.getElementById('userPrompt').value = version?.userPrompt || '';
    document.getElementById('variables').value = JSON.stringify(version?.variables || [], null, 2);
    document.getElementById('settings').value = JSON.stringify(version?.settings || {}, null, 2);
    document.getElementById('notes').value = version?.notes || '';
  }

  async function loadDetails(key) {
    const data = await api(`/api/admin/prompts/${encodeURIComponent(key)}`);
    state.selected = data.prompt;
    titleEl.textContent = `${data.prompt.name} (${data.prompt.key})`;
    const active = data.prompt.versions.find(v => v.version === data.prompt.activeVersion) || data.prompt.versions[0];
    fillForm(active);
    versionsEl.innerHTML = data.prompt.versions.map(v => `<button data-v="${v.version}">Activate v${v.version}${v.version===data.prompt.activeVersion?' (active)':''}</button>`).join(' ');
    versionsEl.querySelectorAll('button').forEach(btn => btn.onclick = async () => {
      await api(`/api/admin/prompts/${encodeURIComponent(key)}/activate`, { method: 'POST', body: JSON.stringify({ version: Number(btn.dataset.v) }) });
      await boot();
      setMessage('Version activated successfully.');
    });
    auditEl.textContent = JSON.stringify(data.prompt.audit, null, 2);
  }

  async function boot() {
    if (!token) {
      statusEl.textContent = 'Missing token. Login from dashboard first.';
      statusEl.className = 'err';
      return;
    }
    const data = await api('/api/admin/prompts');
    state.prompts = data.prompts || [];
    statusEl.textContent = `Admin URL: ${data.adminUrl}`;
    if (llmInfoEl) {
      const provider = data?.llm?.provider || 'unknown';
      const model = data?.llm?.defaultModel || 'n/a';
      llmInfoEl.textContent = `LLM provider: ${provider} · default model: ${model}`;
    }
    listEl.innerHTML = state.prompts.map(p => `<div class="prompt-item" data-key="${p.key}">${p.name}<div class="muted">${p.key} · v${p.activeVersion}</div></div>`).join('');
    listEl.querySelectorAll('.prompt-item').forEach(item => item.onclick = () => loadDetails(item.dataset.key));
  }

  document.getElementById('previewBtn').onclick = async () => {
    try {
      const payload = readForm();
      const vars = {};
      (payload.variables || []).forEach(k => { vars[k] = `[${k}]`; });
      const data = await api(`/api/admin/prompts/${encodeURIComponent(state.selected.key)}/preview`, { method: 'POST', body: JSON.stringify({ variables: vars }) });
      alert(`System:\n${data.rendered.systemPrompt}\n\nUser:\n${data.rendered.userPrompt}`);
      setMessage('Preview generated.');
    } catch (err) { setMessage(err.message, false); }
  };

  document.getElementById('saveBtn').onclick = async () => {
    try {
      const payload = readForm();
      if (!payload.systemPrompt.trim() || !payload.userPrompt.trim()) throw new Error('Prompts cannot be empty.');
      if (!confirm('Confirm save and activate new prompt version?')) return;
      await api(`/api/admin/prompts/${encodeURIComponent(state.selected.key)}`, { method: 'POST', body: JSON.stringify(payload) });
      await boot();
      await loadDetails(state.selected.key);
      setMessage('Prompt saved successfully.');
    } catch (err) { setMessage(err.message, false); }
  };

  document.getElementById('resetBtn').onclick = async () => {
    try {
      if (!confirm('Reset to default version v1?')) return;
      await api(`/api/admin/prompts/${encodeURIComponent(state.selected.key)}/reset`, { method: 'POST' });
      await boot();
      await loadDetails(state.selected.key);
      setMessage('Prompt reset to default.');
    } catch (err) { setMessage(err.message, false); }
  };

  boot().catch(err => {
    statusEl.textContent = err.message;
    statusEl.className = 'err';
  });
})();
