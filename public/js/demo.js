(() => {
  const translations = {
    en: {
      meta: { title: 'MY1 Demo Trading' },
      header: {
        taglineTitle: 'Smart crypto autopilot',
        taglineSubtitle: 'Designed for modern spot traders.',
        demoCta: 'Back to real account'
      },
      accounts: {
        real: 'Real account',
        demo: 'Demo account'
      },
      demo: {
        title: 'Demo trading cockpit',
        subtitle: 'Preview manual and AI strategies with simulated balances. Everything here runs in training mode.',
        badge: 'Preloaded',
        infoTitle: 'What is demo mode?',
        infoBody: 'Use the demo workspace to explore how MY1 behaves without connecting your exchange.',
        infoPoint1: 'No subscription is required — demo mode is unlocked for every user.',
        infoPoint2: 'Binance keys are not needed; the simulator uses built-in market data.',
        infoPoint3: 'Future updates will let you practice managing rules before going live.',
        manualTitle: 'Manual rules (demo)',
        manualSubtitle: 'Test dip-buying and take-profit ideas with simulated capital.',
        manual: {
          assetId: 'Asset ID (CoinGecko)',
          assetSymbol: 'Symbol',
          entryPrice: 'Entry price (USD)',
          takeProfit: 'Take profit %',
          stopLoss: 'Stop loss %',
          budget: 'Budget (USD)',
          create: 'Create demo rule',
          assetIdPlaceholder: 'bitcoin',
          assetSymbolPlaceholder: 'BTC',
          entryPlaceholder: '60000',
          takeProfitPlaceholder: '2',
          stopLossPlaceholder: '1',
          budgetPlaceholder: '100'
        },
        aiTitle: 'AI rules (demo)',
        aiSubtitle: 'Preview AI-generated strategies in a safe sandbox.',
        ai: {
          budget: 'Budget (USD)',
          locale: 'Language',
          model: 'Model',
          generate: 'Generate with AI',
          budgetPlaceholder: '150',
          modelPlaceholder: 'gpt-4o-mini',
          localeEnglish: 'English',
          localeArabic: 'Arabic'
        },
        ordersTitle: 'Open orders (demo)',
        ordersSubtitle: 'Track how demo orders would execute without risking funds.',
        completedTitle: 'Completed trades (demo)',
        completedSubtitle: 'Review the outcome of simulated trades once they close.',
        actions: {
          refresh: 'Refresh'
        },
        table: {
          asset: 'Asset',
          entry: 'Entry',
          targets: 'Targets',
          budget: 'Budget',
          position: 'Position',
          actions: 'Actions',
          summary: 'Summary',
          side: 'Side',
          price: 'Price',
          quantity: 'Quantity',
          value: 'Value',
          status: 'Status',
          exit: 'Exit',
          profit: 'Profit',
          opened: 'Opened',
          empty: 'No demo rules yet.',
          ordersEmpty: 'No demo orders yet.',
          tradesEmpty: 'No completed demo trades yet.'
        },
        position: {
          flat: 'Waiting for entry',
          open: 'Open @ {{price}} for {{qty}}'
        },
        status: {
          loginRequired: 'Sign in from the main dashboard to use demo mode.',
          loading: 'Loading demo data...',
          created: 'Demo rule created successfully.',
          generated: 'AI demo rule generated successfully.',
          deleted: 'Demo rule removed.',
          error: 'Something went wrong, please try again.'
        },
        buttons: {
          delete: 'Delete'
        }
      }
    },
    ar: {
      meta: { title: 'وضع التداول التجريبي MY1' },
      header: {
        taglineTitle: 'طيار آلي ذكي للعملات الرقمية',
        taglineSubtitle: 'مصمم لمتداولي السبوت العصريين.',
        demoCta: 'العودة للحساب الحقيقي'
      },
      accounts: {
        real: 'الحساب الحقيقي',
        demo: 'الحساب التجريبي'
      },
      demo: {
        title: 'قمرة التداول التجريبية',
        subtitle: 'استكشف القواعد اليدوية والذكاء الاصطناعي بأرصدة افتراضية. كل شيء هنا يعمل في وضع التدريب.',
        badge: 'افتراضي',
        infoTitle: 'ما هو الوضع التجريبي؟',
        infoBody: 'استخدم مساحة العمل التجريبية لمعرفة كيفية عمل MY1 بدون ربط منصتك.',
        infoPoint1: 'لا حاجة لأي اشتراك — الوضع التجريبي متاح للجميع.',
        infoPoint2: 'لا يتطلب مفاتيح Binance؛ يعتمد المحاكي على بيانات سوق مدمجة.',
        infoPoint3: 'تحديثات قادمة ستتيح لك التدرب على إدارة القواعد قبل التفعيل الحقيقي.',
        manualTitle: 'القواعد اليدوية (تجريبي)',
        manualSubtitle: 'اختبر أفكار الشراء عند الانخفاض وجني الربح برصيد افتراضي.',
        manual: {
          assetId: 'معرّف الأصل (CoinGecko)',
          assetSymbol: 'الرمز',
          entryPrice: 'سعر الدخول (دولار)',
          takeProfit: 'نسبة جني الربح %',
          stopLoss: 'نسبة وقف الخسارة %',
          budget: 'الميزانية (دولار)',
          create: 'إنشاء قاعدة تجريبية',
          assetIdPlaceholder: 'bitcoin',
          assetSymbolPlaceholder: 'BTC',
          entryPlaceholder: '60000',
          takeProfitPlaceholder: '2',
          stopLossPlaceholder: '1',
          budgetPlaceholder: '100'
        },
        aiTitle: 'قواعد الذكاء الاصطناعي (تجريبي)',
        aiSubtitle: 'استعرض الاستراتيجيات المولدة بالذكاء الاصطناعي في بيئة آمنة.',
        ai: {
          budget: 'الميزانية (دولار)',
          locale: 'اللغة',
          model: 'النموذج',
          generate: 'توليد باستخدام الذكاء الاصطناعي',
          budgetPlaceholder: '150',
          modelPlaceholder: 'gpt-4o-mini',
          localeEnglish: 'الإنجليزية',
          localeArabic: 'العربية'
        },
        ordersTitle: 'الأوامر المفتوحة (تجريبي)',
        ordersSubtitle: 'تابع كيفية تنفيذ الأوامر التجريبية بدون مخاطرة.',
        completedTitle: 'الصفقات المكتملة (تجريبي)',
        completedSubtitle: 'راجع نتائج الصفقات التجريبية بعد إغلاقها.',
        actions: {
          refresh: 'تحديث'
        },
        table: {
          asset: 'الأصل',
          entry: 'الدخول',
          targets: 'الأهداف',
          budget: 'الميزانية',
          position: 'المركز',
          actions: 'إجراءات',
          summary: 'الملخص',
          side: 'النوع',
          price: 'السعر',
          quantity: 'الكمية',
          value: 'القيمة',
          status: 'الحالة',
          exit: 'الخروج',
          profit: 'الربح',
          opened: 'تاريخ الافتتاح',
          empty: 'لا توجد قواعد تجريبية بعد.',
          ordersEmpty: 'لا توجد أوامر تجريبية بعد.',
          tradesEmpty: 'لا توجد صفقات تجريبية مكتملة بعد.'
        },
        position: {
          flat: 'بانتظار الإشارة',
          open: 'مفتوح @ {{price}} لكمية {{qty}}'
        },
        status: {
          loginRequired: 'سجّل الدخول من الواجهة الرئيسية لاستخدام الوضع التجريبي.',
          loading: 'جاري تحميل بيانات التجربة...',
          created: 'تم إنشاء القاعدة التجريبية بنجاح.',
          generated: 'تم توليد قاعدة الذكاء الاصطناعي التجريبية بنجاح.',
          deleted: 'تم حذف القاعدة التجريبية.',
          error: 'حدث خطأ ما، حاول مرة أخرى.'
        },
        buttons: {
          delete: 'حذف'
        }
      }
    }
  };

  const state = {
    language: localStorage.getItem('mybot_language') || 'en',
    token: localStorage.getItem('mybot_token') || '',
    rules: [],
    orders: [],
    trades: [],
    timers: [],
    loading: {
      rules: false,
      orders: false,
      trades: false,
      manual: false,
      ai: false
    }
  };

  const languageToggle = document.getElementById('languageToggle');
  const accountRealBtn = document.getElementById('accountRealBtn');
  const accountDemoBtn = document.getElementById('accountDemoBtn');
  const statusEl = document.getElementById('demoStatus');
  const manualForm = document.getElementById('manualDemoForm');
  const manualSubmitBtn = document.getElementById('manualDemoSubmit');
  const manualRefreshBtn = document.getElementById('manualDemoRefresh');
  const manualAssetId = document.getElementById('manualAssetId');
  const manualAssetSymbol = document.getElementById('manualAssetSymbol');
  const manualEntryPrice = document.getElementById('manualEntryPrice');
  const manualTakeProfit = document.getElementById('manualTakeProfit');
  const manualStopLoss = document.getElementById('manualStopLoss');
  const manualBudget = document.getElementById('manualBudget');
  const manualTableBody = document.querySelector('#manualDemoTable tbody');

  const aiForm = document.getElementById('aiDemoForm');
  const aiSubmitBtn = document.getElementById('aiDemoSubmit');
  const aiRefreshBtn = document.getElementById('aiDemoRefresh');
  const aiBudgetInput = document.getElementById('aiDemoBudget');
  const aiLocaleSelect = document.getElementById('aiDemoLocale');
  const aiModelInput = document.getElementById('aiDemoModel');
  const aiTableBody = document.querySelector('#aiDemoTable tbody');

  const ordersRefreshBtn = document.getElementById('ordersDemoRefresh');
  const ordersTableBody = document.querySelector('#ordersDemoTable tbody');
  const tradesRefreshBtn = document.getElementById('tradesDemoRefresh');
  const tradesTableBody = document.querySelector('#tradesDemoTable tbody');
  let statusTimer = null;

  function resolveTranslation(lang, key) {
    const parts = key.split('.');
    let target = translations[lang] || translations.en;
    let fallback = translations.en;
    for (const part of parts) {
      target = target && target[part] !== undefined ? target[part] : undefined;
      fallback = fallback && fallback[part] !== undefined ? fallback[part] : undefined;
    }
    return target !== undefined ? target : fallback;
  }

  function translate(key, params) {
    let value = resolveTranslation(state.language, key);
    if (typeof value !== 'string') return key;
    if (params) {
      value = value.replace(/\{\{(.*?)\}\}/g, (_, token) => {
        const trimmed = token.trim();
        return params[trimmed] !== undefined ? params[trimmed] : '';
      });
    }
    return value;
  }

  function setLanguage(lang) {
    state.language = lang === 'ar' ? 'ar' : 'en';
    localStorage.setItem('mybot_language', state.language);
    applyTranslations();
    renderAll();
  }

  function applyTranslations() {
    const lang = state.language === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = resolveTranslation(lang, 'meta.title');
    if (languageToggle) {
      languageToggle.textContent = lang === 'ar' ? 'English' : 'عربي';
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = resolveTranslation(lang, key);
      if (typeof text === 'string') {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = resolveTranslation(lang, key);
      if (typeof text === 'string') {
        el.setAttribute('placeholder', text);
      }
    });
    document.querySelectorAll('[data-i18n-option]').forEach(el => {
      const key = el.getAttribute('data-i18n-option');
      const text = resolveTranslation(lang, key);
      if (typeof text === 'string') {
        el.textContent = text;
      }
    });
  }

  function setStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = `status ${message ? type : ''}`.trim();
    clearTimeout(statusTimer);
    if (message) {
      statusTimer = setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
      }, 6000);
    }
  }

  function requireToken() {
    if (state.token) return false;
    disableForms(true);
    setStatus(translate('demo.status.loginRequired'), 'error');
    return true;
  }

  function disableForms(disabled) {
    const forms = [manualSubmitBtn, manualRefreshBtn, aiSubmitBtn, aiRefreshBtn, ordersRefreshBtn, tradesRefreshBtn];
    forms.forEach(btn => {
      if (btn) {
        btn.disabled = disabled;
        btn.dataset.loading = 'false';
      }
    });
    if (manualForm) {
      manualForm.querySelectorAll('input, button, select').forEach(el => {
        if (el !== manualSubmitBtn && el !== manualRefreshBtn) {
          el.disabled = disabled;
        }
      });
    }
    if (aiForm) {
      aiForm.querySelectorAll('input, button, select').forEach(el => {
        if (el !== aiSubmitBtn && el !== aiRefreshBtn) {
          el.disabled = disabled;
        }
      });
    }
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.dataset.loading = isLoading ? 'true' : 'false';
  }

  async function api(url, options = {}) {
    if (requireToken()) {
      throw new Error('AUTH_REQUIRED');
    }
    const headers = options.headers ? { ...options.headers } : {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    const opts = { ...options, headers };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, opts);
    if (res.status === 204) {
      return {};
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        state.token = '';
        localStorage.removeItem('mybot_token');
        disableForms(true);
        setStatus(translate('demo.status.loginRequired'), 'error');
        state.timers.forEach(timer => clearInterval(timer));
        state.timers = [];
        throw new Error('AUTH_REQUIRED');
      }
      const message = typeof data?.error === 'string' ? data.error : res.statusText;
      throw new Error(message || 'Request failed');
    }
    return data;
  }

  function formatNumber(value, { maximumFractionDigits = 4 } = {}) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char] || char));
  }

  function formatCurrency(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }

  function formatTimestamp(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    const date = new Date(num);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }

  function renderManualRules(rules) {
    if (!manualTableBody) return;
    manualTableBody.innerHTML = '';
    if (!rules.length) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = translate('demo.table.empty');
      row.appendChild(cell);
      manualTableBody.appendChild(row);
      return;
    }
    rules.forEach(rule => {
      const row = document.createElement('tr');
      const targets = [];
      if (rule.takeProfitPct !== null && rule.takeProfitPct !== undefined) {
        targets.push(`${formatNumber(rule.takeProfitPct, { maximumFractionDigits: 2 })}% TP`);
      }
      if (rule.stopLossPct !== null && rule.stopLossPct !== undefined) {
        targets.push(`${formatNumber(rule.stopLossPct, { maximumFractionDigits: 2 })}% SL`);
      }
      const targetCell = targets.join(' / ');
      const positionText = rule.openPosition
        ? translate('demo.position.open', {
            price: formatNumber(rule.openPosition.price, { maximumFractionDigits: 2 }),
            qty: formatNumber(rule.openPosition.quantity, { maximumFractionDigits: 4 })
          })
        : translate('demo.position.flat');
      const entryPrice = formatNumber(rule.entryPriceUSD, { maximumFractionDigits: 2 });
      row.innerHTML = `
        <td>${escapeHtml(rule.assetSymbol)}</td>
        <td>${escapeHtml(entryPrice)}</td>
        <td>${escapeHtml(targetCell || '-')}</td>
        <td>${escapeHtml(formatCurrency(rule.budgetUSD))}</td>
        <td>${escapeHtml(positionText)}</td>
        <td><button class="btn danger" data-action="delete" data-id="${escapeHtml(rule.id)}">${translate('demo.buttons.delete')}</button></td>
      `;
      manualTableBody.appendChild(row);
    });
  }

  function renderAiRules(rules) {
    if (!aiTableBody) return;
    aiTableBody.innerHTML = '';
    if (!rules.length) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = translate('demo.table.empty');
      row.appendChild(cell);
      aiTableBody.appendChild(row);
      return;
    }
    rules.forEach(rule => {
      const summary = rule.aiSummary || '-';
      const targets = [];
      if (rule.takeProfitPct !== null && rule.takeProfitPct !== undefined) {
        targets.push(`${formatNumber(rule.takeProfitPct, { maximumFractionDigits: 2 })}% TP`);
      }
      if (rule.stopLossPct !== null && rule.stopLossPct !== undefined) {
        targets.push(`${formatNumber(rule.stopLossPct, { maximumFractionDigits: 2 })}% SL`);
      }
      const targetCell = targets.join(' / ');
      const row = document.createElement('tr');
      const entryPrice = formatNumber(rule.entryPriceUSD, { maximumFractionDigits: 2 });
      row.innerHTML = `
        <td>${escapeHtml(rule.assetSymbol)}</td>
        <td>${escapeHtml(entryPrice)}</td>
        <td>${escapeHtml(targetCell || '-')}</td>
        <td>${escapeHtml(formatCurrency(rule.budgetUSD))}</td>
        <td>${escapeHtml(summary)}</td>
        <td><button class="btn danger" data-action="delete" data-id="${escapeHtml(rule.id)}">${translate('demo.buttons.delete')}</button></td>
      `;
      aiTableBody.appendChild(row);
    });
  }

  function renderOrders(orders) {
    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = '';
    if (!orders.length) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = translate('demo.table.ordersEmpty');
      row.appendChild(cell);
      ordersTableBody.appendChild(row);
      return;
    }
    orders.forEach(order => {
      const row = document.createElement('tr');
      const price = formatNumber(order.price, { maximumFractionDigits: 4 });
      const quantity = formatNumber(order.quantity, { maximumFractionDigits: 4 });
      row.innerHTML = `
        <td>${escapeHtml(order.assetSymbol)}</td>
        <td>${escapeHtml(order.side)}</td>
        <td>${escapeHtml(price)}</td>
        <td>${escapeHtml(quantity)}</td>
        <td>${escapeHtml(formatCurrency(order.valueUSD))}</td>
        <td>${escapeHtml(order.status)}</td>
      `;
      ordersTableBody.appendChild(row);
    });
  }

  function renderTrades(trades) {
    if (!tradesTableBody) return;
    tradesTableBody.innerHTML = '';
    if (!trades.length) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = translate('demo.table.tradesEmpty');
      row.appendChild(cell);
      tradesTableBody.appendChild(row);
      return;
    }
    trades.forEach(trade => {
      const row = document.createElement('tr');
      const entryPrice = formatNumber(trade.entryPrice, { maximumFractionDigits: 4 });
      const exitPrice = formatNumber(trade.exitPrice, { maximumFractionDigits: 4 });
      const quantity = formatNumber(trade.quantity, { maximumFractionDigits: 4 });
      const profitPct = formatNumber(trade.profitPct, { maximumFractionDigits: 2 });
      const createdAt = formatTimestamp(trade.createdAt);
      row.innerHTML = `
        <td>${escapeHtml(trade.assetSymbol)}</td>
        <td>${escapeHtml(entryPrice)}</td>
        <td>${escapeHtml(exitPrice)}</td>
        <td>${escapeHtml(quantity)}</td>
        <td>${escapeHtml(formatCurrency(trade.profitUSD))} (${escapeHtml(profitPct)}%)</td>
        <td>${escapeHtml(createdAt)}</td>
      `;
      tradesTableBody.appendChild(row);
    });
  }

  function renderAll() {
    const manualRules = state.rules.filter(rule => rule.type === 'manual');
    const aiRules = state.rules.filter(rule => rule.type === 'ai');
    renderManualRules(manualRules);
    renderAiRules(aiRules);
    renderOrders(state.orders);
    renderTrades(state.trades);
  }

  async function loadRules() {
    if (state.loading.rules) return;
    state.loading.rules = true;
    try {
      const data = await api('/api/demo/rules');
      state.rules = Array.isArray(data?.rules) ? data.rules : [];
      renderAll();
    } catch (err) {
      console.error('loadRules error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    } finally {
      state.loading.rules = false;
    }
  }

  async function loadOrders() {
    if (state.loading.orders) return;
    state.loading.orders = true;
    try {
      const data = await api('/api/demo/orders?limit=20');
      state.orders = Array.isArray(data?.orders) ? data.orders : [];
      renderOrders(state.orders);
    } catch (err) {
      console.error('loadOrders error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    } finally {
      state.loading.orders = false;
    }
  }

  async function loadTrades() {
    if (state.loading.trades) return;
    state.loading.trades = true;
    try {
      const data = await api('/api/demo/trades?limit=20');
      state.trades = Array.isArray(data?.trades) ? data.trades : [];
      renderTrades(state.trades);
    } catch (err) {
      console.error('loadTrades error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    } finally {
      state.loading.trades = false;
    }
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    if (requireToken()) return;
    const assetId = manualAssetId.value.trim();
    const assetSymbol = manualAssetSymbol.value.trim();
    const entryPrice = Number(manualEntryPrice.value);
    const takeProfit = Number(manualTakeProfit.value);
    const stopLoss = Number(manualStopLoss.value);
    const budget = Number(manualBudget.value);
    if (!assetId || !assetSymbol || !(entryPrice > 0) || !(budget > 0)) {
      setStatus(translate('demo.status.error'), 'error');
      return;
    }
    if (!(takeProfit > 0) && !(stopLoss > 0)) {
      setStatus(translate('demo.status.error'), 'error');
      return;
    }
    setButtonLoading(manualSubmitBtn, true);
    try {
      await api('/api/demo/rules/manual', {
        method: 'POST',
        body: {
          assetId,
          assetSymbol,
          entryPriceUSD: entryPrice,
          takeProfitPct: takeProfit,
          stopLossPct: stopLoss,
          budgetUSD: budget
        }
      });
      setStatus(translate('demo.status.created'), 'success');
      manualForm.reset();
      await loadRules();
      await loadOrders();
    } catch (err) {
      console.error('manual rule error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    } finally {
      setButtonLoading(manualSubmitBtn, false);
    }
  }

  async function handleAiSubmit(event) {
    event.preventDefault();
    if (requireToken()) return;
    const budget = Number(aiBudgetInput.value);
    if (!(budget > 0)) {
      setStatus(translate('demo.status.error'), 'error');
      return;
    }
    const body = {
      budgetUSD: budget,
      locale: aiLocaleSelect.value || 'en'
    };
    const model = aiModelInput.value.trim();
    if (model) body.model = model;
    setButtonLoading(aiSubmitBtn, true);
    try {
      await api('/api/demo/rules/ai', {
        method: 'POST',
        body
      });
      setStatus(translate('demo.status.generated'), 'success');
      await loadRules();
      await loadOrders();
    } catch (err) {
      console.error('ai rule error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    } finally {
      setButtonLoading(aiSubmitBtn, false);
    }
  }

  async function handleDelete(ruleId) {
    if (!ruleId) return;
    if (requireToken()) return;
    setStatus('', 'info');
    try {
      await api(`/api/demo/rules/${encodeURIComponent(ruleId)}`, { method: 'DELETE' });
      setStatus(translate('demo.status.deleted'), 'success');
      await loadRules();
      await loadOrders();
    } catch (err) {
      console.error('delete rule error', err);
      if (err.message === 'AUTH_REQUIRED') return;
      setStatus(err.message || translate('demo.status.error'), 'error');
    }
  }

  function setupEventListeners() {
    if (languageToggle) {
      languageToggle.addEventListener('click', () => {
        setLanguage(state.language === 'ar' ? 'en' : 'ar');
      });
    }
    if (accountRealBtn) {
      accountRealBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
    if (accountDemoBtn) {
      accountDemoBtn.classList.add('is-active');
      accountDemoBtn.setAttribute('aria-pressed', 'true');
    }
    if (manualForm) {
      manualForm.addEventListener('submit', handleManualSubmit);
    }
    if (manualRefreshBtn) {
      manualRefreshBtn.addEventListener('click', () => {
        loadRules();
      });
    }
    if (manualTableBody) {
      manualTableBody.addEventListener('click', event => {
        const btn = event.target.closest('button[data-action="delete"]');
        if (!btn) return;
        handleDelete(btn.getAttribute('data-id'));
      });
    }
    if (aiForm) {
      aiForm.addEventListener('submit', handleAiSubmit);
    }
    if (aiRefreshBtn) {
      aiRefreshBtn.addEventListener('click', () => {
        loadRules();
      });
    }
    if (aiTableBody) {
      aiTableBody.addEventListener('click', event => {
        const btn = event.target.closest('button[data-action="delete"]');
        if (!btn) return;
        handleDelete(btn.getAttribute('data-id'));
      });
    }
    if (ordersRefreshBtn) {
      ordersRefreshBtn.addEventListener('click', () => {
        loadOrders();
      });
    }
    if (tradesRefreshBtn) {
      tradesRefreshBtn.addEventListener('click', () => {
        loadTrades();
      });
    }
  }

  function scheduleAutoRefresh() {
    state.timers.forEach(timer => clearInterval(timer));
    state.timers = [];
    const rulesTimer = setInterval(loadRules, 30000);
    const ordersTimer = setInterval(loadOrders, 20000);
    const tradesTimer = setInterval(loadTrades, 45000);
    state.timers.push(rulesTimer, ordersTimer, tradesTimer);
  }

  async function bootstrap() {
    applyTranslations();
    setupEventListeners();
    if (requireToken()) {
      return;
    }
    disableForms(false);
    setStatus(translate('demo.status.loading'), 'info');
    await Promise.all([loadRules(), loadOrders(), loadTrades()]);
    setStatus('', 'info');
    scheduleAutoRefresh();
  }

  bootstrap();
})();
