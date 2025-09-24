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
        manualPlaceholder: 'Demo manual rules will appear here soon.',
        aiTitle: 'AI rules (demo)',
        aiSubtitle: 'Preview AI-generated strategies in a safe sandbox.',
        aiPlaceholder: 'Demo AI rules will appear here soon.',
        ordersTitle: 'Open orders (demo)',
        ordersSubtitle: 'Track how demo orders would execute without risking funds.',
        ordersPlaceholder: 'Demo open orders will appear here soon.',
        completedTitle: 'Completed trades (demo)',
        completedSubtitle: 'Review the outcome of simulated trades once they close.',
        completedPlaceholder: 'Demo completed trades will appear here soon.'
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
        manualPlaceholder: 'سيتم عرض القواعد اليدوية التجريبية هنا قريبًا.',
        aiTitle: 'قواعد الذكاء الاصطناعي (تجريبي)',
        aiSubtitle: 'استعرض الاستراتيجيات المولدة بالذكاء الاصطناعي في بيئة آمنة.',
        aiPlaceholder: 'سيتم عرض قواعد الذكاء الاصطناعي التجريبية هنا قريبًا.',
        ordersTitle: 'الأوامر المفتوحة (تجريبي)',
        ordersSubtitle: 'تابع كيف ستُنفذ الأوامر التجريبية دون مخاطرة.',
        ordersPlaceholder: 'سيتم عرض الأوامر المفتوحة التجريبية هنا قريبًا.',
        completedTitle: 'الصفقات المكتملة (تجريبي)',
        completedSubtitle: 'راجع نتائج الصفقات التجريبية بعد إغلاقها.',
        completedPlaceholder: 'سيتم عرض الصفقات المكتملة التجريبية هنا قريبًا.'
      }
    }
  };

  const state = {
    language: localStorage.getItem('mybot_language') || 'en'
  };

  const languageToggle = document.getElementById('languageToggle');
  const accountRealBtn = document.getElementById('accountRealBtn');
  const accountDemoBtn = document.getElementById('accountDemoBtn');

  function resolveTranslation(lang, key) {
    const fallback = translations.en;
    const parts = key.split('.');
    let target = translations[lang] || translations.en;
    let fallbackTarget = fallback;
    for (const part of parts) {
      target = target && target[part] !== undefined ? target[part] : undefined;
      fallbackTarget = fallbackTarget && fallbackTarget[part] !== undefined ? fallbackTarget[part] : undefined;
    }
    return target !== undefined ? target : fallbackTarget;
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
      const value = resolveTranslation(lang, key);
      if (typeof value === 'string') {
        el.textContent = value;
      }
    });
  }

  function setLanguage(lang) {
    state.language = lang;
    localStorage.setItem('mybot_language', state.language);
    applyTranslations();
  }

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
    accountDemoBtn.addEventListener('click', () => {
      accountDemoBtn.classList.add('is-active');
      accountDemoBtn.setAttribute('aria-pressed', 'true');
    });
  }

  applyTranslations();
})();
