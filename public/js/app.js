  (function(){
    const translations = {
      en: {
        meta: { title: "MY1 Smart Trading Platform" },
        header: {
          taglineTitle: "Smart crypto autopilot",
          taglineSubtitle: "Designed for modern spot traders.",
          cta: "Explore dashboard",
          demoCta: "Back to real account"
        },
        hero: {
          title: "Trade smarter with AI-assisted automation",
          subtitle: "MY1 monitors the market in real time, suggests AI-powered strategies, and executes your spot rules with transparent controls.",
          primaryCta: "Start now",
          secondaryCta: "See how it works"
        },
        features: {
          automationTitle: "Personal rule engine",
          automationCopy: "Define dip buying and take-profit logic with full transparency. Rules stay under your account control.",
          securityTitle: "Secure key management",
          securityCopy: "Connect Binance spot keys with encryption. You are always able to rotate or disconnect in one click.",
          aiTitle: "AI market insights",
          aiCopy: "Leverage live market research prompts to craft strategies backed by up-to-date data."
        },
        pricing: {
          title: "Plans built for every trader",
          subtitle: "Unlock manual or AI-powered automation by choosing the package that matches your strategy.",
          manualFeature: "Manual rules: {{count}} active",
          aiFeature: "AI rules: {{count}} active",
          aiDisabled: "AI rules not included",
          manualOnly: "Manual automation included",
          duration: "{{days}} day subscription",
          price: "${{price}}"
        },
        auth: {
          title: "Your personal trading cockpit",
          description: "Track AI-generated ideas, manage manual rules, and sync Binance activity from a single secure interface.",
          loginTab: "Sign in",
          registerTab: "Create account",
          emailLabel: "Email",
          emailPlaceholder: "name@example.com",
          passwordLabel: "Password",
          passwordPlaceholder: "Enter password",
          mfaLabel: "Authenticator code",
          mfaPlaceholder: "123456",
          nameLabel: "Full name",
          namePlaceholder: "How should we greet you?",
          loginCta: "Sign in",
          registerCta: "Create account"
        },
        dashboard: {
          title: "MY1 control center",
          subtitle: "Manage AI ideas, monitor open orders, and keep your Binance link under supervision.",
          welcome: "Welcome",
          logout: "Sign out"
        },
        accounts: {
          real: "Real account",
          demo: "Demo account"
        },
        api: {
          title: "Connect Binance keys",
          description: "Add your spot API credentials to activate the engine. Keys remain encrypted and you can revoke them any time.",
          statusLabel: "Status:",
          connected: "Connected",
          disconnected: "Disconnected",
          keyLabel: "API key",
          secretLabel: "API secret",
          save: "Save keys",
          remove: "Disconnect",
          helper: "Use spot trading keys with read and trade permissions only."
        },
        manual: {
          title: "Manual rule",
          description: "Create a dip buying strategy with your preferred take-profit target.",
          symbolLabel: "Pair",
          symbolPlaceholder: "Example: SOLUSDT",
          dipLabel: "Buy the dip %",
          dipPlaceholder: "2",
          tpLabel: "Take profit %",
          tpPlaceholder: "2",
          budgetLabel: "Trade budget (USDT)",
          budgetPlaceholder: "50",
          stopLabel: "Stop loss %",
          stopPlaceholder: "Optional",
          trailingLabel: "Trailing stop %",
          trailingPlaceholder: "Optional",
          partialsLabel: "Partial take-profits",
          partialsPlaceholder: "50@2,50@5",
          partialsHint: "Format: quantity% @ target%. Example: 50@2 means sell 50% at +2%.",
          indicatorsTitle: "Indicator filters (optional)",
          indicatorInterval: "Indicator timeframe",
          indicatorRsiPeriod: "RSI period",
          indicatorRsiEntry: "Max RSI for entry",
          indicatorRsiExit: "Min RSI for exit",
          indicatorMacdFast: "MACD fast length",
          indicatorMacdSlow: "MACD slow length",
          indicatorMacdSignal: "MACD signal length",
          indicatorMacdEntry: "MACD entry filter",
          indicatorMacdExit: "MACD exit filter",
          indicatorMacdNone: "No filter",
          indicatorMacdBullish: "Bullish crossover",
          indicatorMacdBearish: "Bearish crossover",
          indicatorsHint: "RSI and MACD filters are optional. Leave fields empty to ignore them.",
          add: "Add rule",
          sync: "Sync with engine",
          tableTitle: "Manual rules",
          table: {
            rule: "Rule",
            targets: "Targets",
            budget: "Budget",
            status: "Status",
            actions: "Actions"
          }
        },
        ai: {
          title: "AI-powered rule",
          description: "Request a market-ready spot strategy backed by real-time research.",
          budgetLabel: "AI budget (USDT)",
          modelLabel: "Model",
          generate: "Generate with AI",
          helper: "The assistant researches live data before returning a ready-to-use rule.",
          tableTitle: "AI rules",
          table: {
            rule: "Rule",
            entry: "Entry price",
            exit: "Take-profit",
            budget: "Budget",
            status: "Status",
            actions: "Actions"
          }
        },
        orders: {
          title: "Open orders",
          refresh: "Refresh",
          table: {
            symbol: "Pair",
            side: "Side",
            price: "Price",
            qty: "Quantity",
            type: "Type",
            status: "Status",
            updated: "Last update"
          },
          empty: "No open orders right now."
        },
        completed: {
          title: "Completed trades",
          subtitle: "Latest buy & sell cycles with realised profit.",
          refresh: "Refresh",
          status: "Completed",
          closed: "Closed",
          opened: "Opened",
          duration: "Duration",
          instant: "Instant",
          empty: "No completed trades yet.",
          labels: {
            quantity: "Quantity",
            avgBuy: "Avg buy",
            avgSell: "Avg sell",
            profit: "Profit",
            return: "Return"
          }
        },
        analytics: {
          title: "Performance overview",
          totalProfit: "Total profit",
          totalTrades: "Total trades",
          averageReturn: "Avg return",
          winRate: "Win rate",
          bestTrade: "Best trade",
          worstTrade: "Worst trade",
          avgHold: "Average hold"
        },
        security: {
          title: "Security center",
          description: "Manage login protection and instant alerts for rule activity.",
          alertEmailLabel: "Alert email",
          alertEmailPlaceholder: "name@example.com",
          alertWebhookLabel: "Webhook URL",
          alertWebhookPlaceholder: "https://...",
          alertTelegramLabel: "Telegram chat ID",
          alertTelegramPlaceholder: "123456789",
          saveAlerts: "Save alert channels",
          mfaTitle: "Multi-factor authentication",
          mfaDisabled: "Two-factor authentication is currently disabled.",
          mfaEnabledStatus: "Two-factor authentication is active.",
          mfaInstructions: "Scan or enter this secret into your authenticator app, then confirm with a code.",
          setupMfa: "Generate secret",
          enableMfa: "Enable MFA",
          disableMfa: "Disable",
          confirmMfa: "Confirm",
          mfaPlaceholder: "123456"
        },
        manualRules: {
          buyOnDipLabel: "Buy on dip:",
          takeProfitLabel: "Take profit:",
          indicatorsLabel: "Indicators:",
          intervalLabel: "Interval",
          rsiLabel: "RSI",
          macdLabel: "MACD",
          entryLabel: "Entry",
          exitLabel: "Exit",
          macdBullish: "Bullish",
          macdBearish: "Bearish",
          empty: "No manual rules yet."
        },
        aiRules: {
          summaryToggle: "View AI summary",
          empty: "No AI rules yet."
        },
        common: {
          delete: "Delete",
          confirmDelete: "Delete this rule?",
          enabled: "Enabled",
          disabled: "Disabled"
        },
        status: {
          loginSuccess: "Signed in successfully.",
          registerSuccess: "Account created successfully.",
          keysSaved: "API keys saved.",
          keysRemoved: "Connection removed.",
          manualAdded: "Manual rule added.",
          manualSynced: "Rules synced with engine.",
          aiGenerated: "AI rule generated successfully.",
          ordersRefreshed: "Open orders refreshed.",
          completedRefreshed: "Completed trades updated.",
          ruleActivated: "Rule enabled.",
          rulePaused: "Rule paused.",
          ruleDeleted: "Rule deleted.",
          aiBudgetInvalid: "Enter a valid AI budget.",
          manualLocked: "Manual rules are disabled for your current plan.",
          aiLocked: "AI rules are disabled for your current plan.",
          manualLimit: "Your plan allows up to {{count}} manual rules.",
          aiLimit: "Your plan allows up to {{count}} AI rules.",
          checkoutStarted: "Redirecting you to complete the payment...",
          checkoutError: "Unable to start the checkout. Please try again.",
          alertsSaved: "Alert channels updated.",
          mfaEnabled: "Multi-factor authentication enabled.",
          mfaDisabled: "Multi-factor authentication disabled.",
          mfaSecretGenerated: "Authenticator secret generated. Enter a code to finish setup.",
          mfaTokenRequired: "Enter the 6-digit code from your authenticator app.",
          mfaInvalid: "The code you entered is not valid. Try again.",
          mfaRequired: "Enter your authenticator code to continue."
        },
        subscription: {
          title: "Your plan",
          statusActive: "Active",
          statusExpired: "Expired",
          statusPending: "Awaiting payment",
          statusNone: "No active subscription",
          noPlan: "No active subscription. Pick a plan to unlock automation.",
          currentPlan: "Current plan: {{name}}",
          expires: "Expires on {{date}}",
          daysLeft: "{{count}} days remaining",
          daysLeftOne: "1 day remaining",
          manualFeature: "Manual rules: {{used}} / {{limit}} active",
          manualUnlimited: "Manual rules enabled",
          aiFeature: "AI rules: {{used}} / {{limit}} active",
          aiUnlimited: "AI rules enabled",
          manualDisabled: "Manual rules are disabled for your current plan.",
          aiDisabled: "AI rules are disabled for your current plan.",
          availablePlans: "Available plans",
          chooseProvider: "Checkout with",
          payWithStripe: "Pay with card (Stripe)",
          payWithCryptomus: "Pay with crypto (Cryptomus)",
          loginRequired: "Sign in to subscribe to a plan.",
          renewing: "Processing payment confirmation...",
          historyTitle: "Recent payments",
          historyEmpty: "No subscription history yet.",
          pendingNotice: "Awaiting payment confirmation for {{name}}.",
          providerStripe: "Stripe",
          providerCryptomus: "Cryptomus",
          noPlans: "Plans will be available soon."
        },
        ruleErrors: {
          symbolNotWhitelisted: "Binance rejected {{symbol}} because it isn't whitelisted for your API key. Enable the pair in your Binance API restrictions and try again."
        }
      },
      ar: {
        meta: { title: "منصة MY1 للتداول الذكي" },
        header: {
          taglineTitle: "طيار آلي ذكي للعملات الرقمية",
          taglineSubtitle: "مصمم لمتداولي السبوت العصريين.",
          cta: "استكشف اللوحة",
          demoCta: "العودة للحساب الحقيقي"
        },
        hero: {
          title: "تداول بذكاء مع أتمتة مدعومة بالذكاء الاصطناعي",
          subtitle: "تراقب MY1 السوق لحظيًا، وتقترح استراتيجيات مدعومة بالذكاء الاصطناعي، وتنفذ قواعدك بوضوح كامل.",
          primaryCta: "ابدأ الآن",
          secondaryCta: "تعرّف على آلية العمل"
        },
        features: {
          automationTitle: "محرك قواعد شخصي",
          automationCopy: "كوِّن قواعد شراء عند الانخفاض وجني ربح مع تحكم كامل. تبقى القواعد تحت إدارة حسابك دائمًا.",
          securityTitle: "إدارة مفاتيح آمنة",
          securityCopy: "اربط مفاتيح Binance Spot بتشفير كامل مع إمكانية الفصل أو التدوير بضغطة زر.",
          aiTitle: "رؤى سوقية بالذكاء الاصطناعي",
          aiCopy: "استفد من برومبتات بحث مباشرة لصياغة استراتيجيات مبنية على بيانات محدثة."
        },
        pricing: {
          title: "خطط تناسب كل متداول",
          subtitle: "اختر الباقة التي تناسب استراتيجيتك لتفعيل القواعد اليدوية أو الذكاء الاصطناعي.",
          manualFeature: "القواعد اليدوية: {{count}} مفعلة",
          aiFeature: "قواعد الذكاء الاصطناعي: {{count}} مفعلة",
          aiDisabled: "قواعد الذكاء الاصطناعي غير متضمنة",
          manualOnly: "تشمل القواعد اليدوية",
          duration: "اشتراك لمدة {{days}} يوم",
          price: "{{price}} دولار"
        },
        auth: {
          title: "قمرة القيادة الخاصة بك",
          description: "تابع أفكار الذكاء الاصطناعي، أدر القواعد اليدوية، وراقب نشاط Binance من واجهة آمنة واحدة.",
          loginTab: "تسجيل الدخول",
          registerTab: "إنشاء حساب",
          emailLabel: "البريد الإلكتروني",
          emailPlaceholder: "name@example.com",
          passwordLabel: "كلمة المرور",
          passwordPlaceholder: "أدخل كلمة المرور",
          mfaLabel: "رمز المصادقة",
          mfaPlaceholder: "123456",
          nameLabel: "الاسم الكامل",
          namePlaceholder: "كيف نرحب بك؟",
          loginCta: "دخول",
          registerCta: "إنشاء حساب"
        },
        dashboard: {
          title: "مركز تحكم MY1",
          subtitle: "أدر أفكار الذكاء الاصطناعي، راقب الأوامر المفتوحة، وأشرف على ربط Binance.",
          welcome: "مرحبًا",
          logout: "تسجيل الخروج"
        },
        accounts: {
          real: "الحساب الحقيقي",
          demo: "الحساب التجريبي"
        },
        api: {
          title: "ربط مفاتيح Binance",
          description: "أضف مفاتيح السبوت الخاصة بك لتفعيل المحرك. تبقى المفاتيح مشفرة ويمكنك إزالتها في أي وقت.",
          statusLabel: "الحالة:",
          connected: "متصل",
          disconnected: "غير متصل",
          keyLabel: "مفتاح API",
          secretLabel: "سر API",
          save: "حفظ المفاتيح",
          remove: "إلغاء الربط",
          helper: "استخدم مفاتيح تداول Spot بصلاحيات القراءة والتداول فقط."
        },
        manual: {
          title: "قاعدة يدوية",
          description: "اصنع إستراتيجية شراء عند الانخفاض بأهداف جني ربح مخصصة.",
          symbolLabel: "الزوج",
          symbolPlaceholder: "مثال: SOLUSDT",
          dipLabel: "نسبة الشراء عند الانخفاض %",
          dipPlaceholder: "2",
          tpLabel: "نسبة جني الربح %",
          tpPlaceholder: "2",
          budgetLabel: "ميزانية الصفقة (USDT)",
          budgetPlaceholder: "50",
          stopLabel: "وقف الخسارة %",
          stopPlaceholder: "اختياري",
          trailingLabel: "ستوب متحرك %",
          trailingPlaceholder: "اختياري",
          partialsLabel: "أهداف جني ربح جزئية",
          partialsPlaceholder: "50@2,50@5",
          partialsHint: "اكتب النسبة@الهدف، مثال: ‎50@2‎ تعني بيع 50٪ عند +2٪.",
          indicatorsTitle: "مرشحات المؤشرات (اختياري)",
          indicatorInterval: "الإطار الزمني للمؤشرات",
          indicatorRsiPeriod: "فترة مؤشر RSI",
          indicatorRsiEntry: "أقصى RSI للدخول",
          indicatorRsiExit: "أدنى RSI للخروج",
          indicatorMacdFast: "MACD (الخط السريع)",
          indicatorMacdSlow: "MACD (الخط البطيء)",
          indicatorMacdSignal: "MACD (خط الإشارة)",
          indicatorMacdEntry: "فلتر دخول MACD",
          indicatorMacdExit: "فلتر خروج MACD",
          indicatorMacdNone: "بدون فلتر",
          indicatorMacdBullish: "تقاطع صاعد",
          indicatorMacdBearish: "تقاطع هابط",
          indicatorsHint: "يمكنك تفعيل RSI وMACD للدخول أو الخروج. اترك الحقول فارغة لتجاهلها.",
          add: "إضافة القاعدة",
          sync: "مزامنة مع المحرك",
          tableTitle: "القواعد اليدوية",
          table: {
            rule: "القاعدة",
            targets: "الأهداف",
            budget: "الميزانية",
            status: "الحالة",
            actions: "إجراءات"
          }
        },
        ai: {
          title: "قاعدة بالذكاء الاصطناعي",
          description: "اطلب إستراتيجية تداول فورية مدعومة ببحث لحظي.",
          budgetLabel: "ميزانية الذكاء الاصطناعي (USDT)",
          modelLabel: "النموذج",
          generate: "توليد بالذكاء الاصطناعي",
          helper: "يقوم المساعد بالبحث في البيانات المباشرة قبل إرسال القاعدة.",
          tableTitle: "قواعد الذكاء الاصطناعي",
          table: {
            rule: "القاعدة",
            entry: "سعر الدخول",
            exit: "هدف الربح",
            budget: "الميزانية",
            status: "الحالة",
            actions: "إجراءات"
          }
        },
        orders: {
          title: "الأوامر المفتوحة",
          refresh: "تحديث",
          table: {
            symbol: "الزوج",
            side: "الاتجاه",
            price: "السعر",
            qty: "الكمية",
            type: "النوع",
            status: "الحالة",
            updated: "آخر تحديث"
          },
          empty: "لا توجد أوامر مفتوحة حاليًا."
        },
        completed: {
          title: "الصفقات المكتملة",
          subtitle: "أحدث دورات الشراء والبيع مع صافي الربح المحقق.",
          refresh: "تحديث",
          status: "مكتملة",
          closed: "أُغلقت",
          opened: "وقت الفتح",
          duration: "المدة",
          instant: "فوري",
          empty: "لا توجد صفقات مكتملة بعد.",
          labels: {
            quantity: "الكمية",
            avgBuy: "متوسط الشراء",
            avgSell: "متوسط البيع",
            profit: "الربح",
            return: "العائد"
          }
        },
        analytics: {
          title: "نظرة على الأداء",
          totalProfit: "إجمالي الربح",
          totalTrades: "عدد الصفقات",
          averageReturn: "متوسط العائد",
          winRate: "نسبة الربح",
          bestTrade: "أفضل صفقة",
          worstTrade: "أسوأ صفقة",
          avgHold: "متوسط مدة الصفقة"
        },
        security: {
          title: "مركز الأمان",
          description: "أدر حماية الدخول والتنبيهات الفورية لأداء القواعد.",
          alertEmailLabel: "بريد التنبيه",
          alertEmailPlaceholder: "name@example.com",
          alertWebhookLabel: "رابط الويب هوك",
          alertWebhookPlaceholder: "https://...",
          alertTelegramLabel: "معرّف دردشة تيليجرام",
          alertTelegramPlaceholder: "123456789",
          saveAlerts: "حفظ قنوات التنبيه",
          mfaTitle: "التحقق متعدد العوامل",
          mfaDisabled: "لم يتم تفعيل التحقق بخطوتين بعد.",
          mfaEnabledStatus: "التحقق بخطوتين مفعل حاليًا.",
          mfaInstructions: "امسح أو أدخل هذا المفتاح في تطبيق المصادقة ثم أكد بالرمز.",
          setupMfa: "توليد المفتاح",
          enableMfa: "تفعيل التحقق",
          disableMfa: "تعطيل",
          confirmMfa: "تأكيد",
          mfaPlaceholder: "123456"
        },
        manualRules: {
          buyOnDipLabel: "الشراء عند الانخفاض:",
          takeProfitLabel: "جني الربح:",
          indicatorsLabel: "المؤشرات:",
          intervalLabel: "الإطار",
          rsiLabel: "RSI",
          macdLabel: "MACD",
          entryLabel: "دخول",
          exitLabel: "خروج",
          macdBullish: "صاعد",
          macdBearish: "هابط",
          empty: "لا توجد قواعد يدوية بعد."
        },
        aiRules: {
          summaryToggle: "عرض ملخص الذكاء الاصطناعي",
          empty: "لا توجد قواعد ذكاء اصطناعي بعد."
        },
        common: {
          delete: "حذف",
          confirmDelete: "حذف هذه القاعدة؟",
          enabled: "مفعل",
          disabled: "موقوف"
        },
        status: {
          loginSuccess: "تم تسجيل الدخول بنجاح.",
          registerSuccess: "تم إنشاء الحساب بنجاح.",
          keysSaved: "تم حفظ مفاتيح API.",
          keysRemoved: "تم إلغاء الربط.",
          manualAdded: "تمت إضافة القاعدة اليدوية.",
          manualSynced: "تمت مزامنة القواعد مع المحرك.",
          aiGenerated: "تم توليد قاعدة ذكاء اصطناعي بنجاح.",
          ordersRefreshed: "تم تحديث الأوامر المفتوحة.",
          completedRefreshed: "تم تحديث الصفقات المكتملة.",
          ruleActivated: "تم تفعيل القاعدة.",
          rulePaused: "تم إيقاف القاعدة.",
          ruleDeleted: "تم حذف القاعدة.",
          aiBudgetInvalid: "أدخل ميزانية صحيحة للذكاء الاصطناعي.",
          manualLocked: "القواعد اليدوية غير متاحة في باقتك الحالية.",
          aiLocked: "قواعد الذكاء الاصطناعي غير متاحة في باقتك الحالية.",
          manualLimit: "باقتك تسمح حتى {{count}} من القواعد اليدوية.",
          aiLimit: "باقتك تسمح حتى {{count}} من قواعد الذكاء الاصطناعي.",
          checkoutStarted: "جاري تحويلك لإتمام الدفع...",
          checkoutError: "تعذر بدء عملية الدفع، حاول مرة أخرى.",
          alertsSaved: "تم تحديث قنوات التنبيه.",
          mfaEnabled: "تم تفعيل التحقق متعدد العوامل.",
          mfaDisabled: "تم تعطيل التحقق متعدد العوامل.",
          mfaSecretGenerated: "تم إنشاء مفتاح المصادقة. أدخل الرمز لإكمال التفعيل.",
          mfaTokenRequired: "أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.",
          mfaInvalid: "الرمز غير صحيح، حاول مرة أخرى.",
          mfaRequired: "أدخل رمز المصادقة للمتابعة."
        },
        subscription: {
          title: "باقتك",
          statusActive: "مفعلة",
          statusExpired: "منتهية",
          statusPending: "بانتظار الدفع",
          statusNone: "لا توجد باقة مفعلة",
          noPlan: "لا توجد باقة مفعلة. اختر الباقة المناسبة لتفعيل الخصائص.",
          currentPlan: "الباقة الحالية: {{name}}",
          expires: "تنتهي في {{date}}",
          daysLeft: "متبقي {{count}} يومًا",
          daysLeftOne: "متبقي يوم واحد",
          manualFeature: "القواعد اليدوية: {{used}} / {{limit}} مفعلة",
          manualUnlimited: "القواعد اليدوية مفعلة",
          aiFeature: "قواعد الذكاء الاصطناعي: {{used}} / {{limit}} مفعلة",
          aiUnlimited: "قواعد الذكاء الاصطناعي مفعلة",
          manualDisabled: "القواعد اليدوية غير متاحة في باقتك الحالية.",
          aiDisabled: "قواعد الذكاء الاصطناعي غير متاحة في باقتك الحالية.",
          availablePlans: "الباقات المتاحة",
          chooseProvider: "اختر طريقة الدفع",
          payWithStripe: "الدفع بالبطاقة (Stripe)",
          payWithCryptomus: "الدفع بالعملات الرقمية (Cryptomus)",
          loginRequired: "سجل الدخول للاشتراك في باقة.",
          renewing: "جاري تأكيد عملية الدفع...",
          historyTitle: "سجل الدفعات",
          historyEmpty: "لا يوجد سجل دفعات بعد.",
          pendingNotice: "بانتظار تأكيد الدفع لباقـة {{name}}.",
          providerStripe: "سترايب",
          providerCryptomus: "كريبتومس",
          noPlans: "سيتم إتاحة الباقات قريبًا."
        },
        ruleErrors: {
          symbolNotWhitelisted: "رفضت باينانس تنفيذ {{symbol}} لأن الزوج غير مفعّل لمفتاح الـ API الخاص بك. فعّل الزوج من إعدادات قيود مفاتيح باينانس ثم أعد المحاولة."
        }
      }
    };

    const defaultSecurityState = () => ({
      alertEmail: '',
      alertWebhookUrl: '',
      alertTelegramChat: '',
      preferences: {},
      mfaEnabled: false,
      mfaConfigured: false,
      mfaSecret: null,
      otpauth: null,
      mfaPanelOpen: false,
      showSecret: false,
      mfaMode: 'enable'
    });

    const state = {
      language: localStorage.getItem('mybot_language') || 'en',
      token: localStorage.getItem('mybot_token') || '',
      user: null,
      rules: [],
      plans: [],
      providers: { stripe: false, cryptomus: false },
      entitlements: null,
      ordersTimer: null,
      statusTimer: null,
      hasKeys: false,
      isOrdersLoading: false,
      completedTrades: [],
      completedTradesErrors: [],
      isCompletedTradesLoading: false,
      performanceMetrics: null,
      loginMfaRequired: false,
      security: defaultSecurityState(),
      lastRuleErrorsDigest: ''
    };

    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const landing = document.getElementById('landing');
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    const statusEl = document.getElementById('status');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTabs = document.querySelectorAll('[data-auth-tab]');
    const welcomeName = document.getElementById('welcomeName');
    const logoutBtn = document.getElementById('logoutBtn');
    const apiKeysStatus = document.getElementById('apiKeysStatus');
    const apiKeysForm = document.getElementById('apiKeysForm');
    const removeKeysBtn = document.getElementById('removeKeys');
    const manualForm = document.getElementById('manualForm');
    const syncRulesBtn = document.getElementById('syncRules');
    const aiForm = document.getElementById('aiForm');
    const aiGenerateBtn = document.getElementById('aiGenerate');
    const aiBudgetInput = document.getElementById('aiBudget');
    const aiModelInput = document.getElementById('aiModel');
    const manualTableBody = document.querySelector('#manualRulesTable tbody');
    const aiTableBody = document.querySelector('#aiRulesTable tbody');
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    const completedTradesList = document.getElementById('completedTradesList');
    const completedTradesNotice = document.getElementById('completedTradesNotice');
    const manualCountEl = document.getElementById('manualCount');
    const aiCountEl = document.getElementById('aiCount');
    const refreshOrdersBtn = document.getElementById('refreshOrders');
    const refreshCompletedBtn = document.getElementById('refreshCompletedTrades');
    const languageToggle = document.getElementById('languageToggle');
    const pricingGrid = document.getElementById('pricingGrid');
    const dashboardPlansGrid = document.getElementById('dashboardPlans');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const subscriptionSummary = document.getElementById('subscriptionSummary');
    const subscriptionFeaturesEl = document.getElementById('subscriptionFeatures');
    const subscriptionWarning = document.getElementById('subscriptionWarning');
    const subscriptionActions = document.getElementById('subscriptionActions');
    const subscriptionHistory = document.getElementById('subscriptionHistory');
    const manualRestriction = document.getElementById('manualRestriction');
    const aiRestriction = document.getElementById('aiRestriction');
    const subscriptionCard = document.getElementById('subscriptionCard');
    const performanceMetricsEl = document.getElementById('performanceMetrics');
    const alertSettingsForm = document.getElementById('alertSettingsForm');
    const alertEmailInput = document.getElementById('alertEmail');
    const alertWebhookInput = document.getElementById('alertWebhook');
    const alertTelegramInput = document.getElementById('alertTelegram');
    const mfaStatusText = document.getElementById('mfaStatus');
    const setupMfaBtn = document.getElementById('setupMfaBtn');
    const enableMfaBtn = document.getElementById('enableMfaBtn');
    const disableMfaBtn = document.getElementById('disableMfaBtn');
    const confirmMfaBtn = document.getElementById('confirmMfaBtn');
    const mfaSecretPanel = document.getElementById('mfaSecretPanel');
    const mfaSecretValue = document.getElementById('mfaSecretValue');
    const mfaTokenInput = document.getElementById('mfaTokenInput');
    const loginMfaRow = document.getElementById('loginMfaRow');
    const loginMfaInput = document.getElementById('loginMfa');
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

    let currentOrdersCache = [];

    function applyTranslations() {
      const lang = state.language === 'ar' ? 'ar' : 'en';
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.title = resolveTranslation(lang, 'meta.title');
      languageToggle.textContent = lang === 'ar' ? 'English' : 'عربي';

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

      const statusText = state.hasKeys ? resolveTranslation(lang, 'api.connected') : resolveTranslation(lang, 'api.disconnected');
      apiKeysStatus.textContent = statusText;
      apiKeysStatus.className = `pill ${state.hasKeys ? 'success' : 'danger'}`;

      renderPricingCards();
      renderDashboardPlans();
      renderSubscription();
      renderTables();
      renderOrders(currentOrdersCache);
      renderCompletedTrades(state.completedTrades, state.completedTradesErrors);
      renderPerformanceMetrics();
      renderSecuritySettings();
      renderLoginMfa();
    }

    function setStatus(message, type = 'info') {
      if (!statusEl) return;
      statusEl.textContent = message || '';
      statusEl.className = `status ${message ? type : ''}`.trim();
      clearTimeout(state.statusTimer);
      if (message) {
        state.statusTimer = setTimeout(() => {
          statusEl.textContent = '';
          statusEl.className = 'status';
        }, 6000);
      }
    }

    function setToken(token) {
      state.token = token || '';
      if (state.token) {
        localStorage.setItem('mybot_token', state.token);
      } else {
        localStorage.removeItem('mybot_token');
      }
    }

    function setLanguage(lang) {
      state.language = lang === 'ar' ? 'ar' : 'en';
      localStorage.setItem('mybot_language', state.language);
      applyTranslations();
    }

    function showLanding() {
      landing.classList.remove('hidden');
      authSection.classList.remove('hidden');
      dashboard.classList.add('hidden');
    }

    function showDashboard() {
      landing.classList.add('hidden');
      authSection.classList.add('hidden');
      dashboard.classList.remove('hidden');
    }

    async function api(url, options = {}) {
      const headers = options.headers ? { ...options.headers } : {};
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
      const opts = {
        ...options,
        headers,
      };
      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(options.body);
      }
      const res = await fetch(url, opts);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText || 'Request failed');
      }
      return res.json().catch(() => ({}));
    }

    function extractRules(payload) {
      const list = [];
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.rules)) return payload.rules;
      if (payload && Array.isArray(payload.data)) return payload.data;
      return list;
    }

    async function loadPlans() {
      try {
        const data = await api('/api/plans');
        state.plans = Array.isArray(data?.plans) ? data.plans : [];
        state.providers = {
          stripe: Boolean(data?.providers?.stripe),
          cryptomus: Boolean(data?.providers?.cryptomus)
        };
        renderPricingCards();
        renderDashboardPlans();
      } catch (err) {
        console.error('plan load error', err);
        state.plans = Array.isArray(state.plans) ? state.plans : [];
      }
    }

    function renderTables() {
      renderManualRules();
      renderAiRules();
      announceRuleErrors();
      applyEntitlementsUI();
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    }

    function formatNumber(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '-';
      const abs = Math.abs(num);
      const opts = { maximumFractionDigits: 8 };
      if (abs >= 1000) opts.maximumFractionDigits = 2;
      else if (abs >= 100) opts.maximumFractionDigits = 2;
      else if (abs >= 1) opts.maximumFractionDigits = 4;
      return num.toLocaleString(undefined, opts);
    }

    function formatCurrency(v) {
      const num = Number(v);
      if (!Number.isFinite(num)) return '-';
      return `${formatNumber(num)} USDT`;
    }

    function formatUsageCount(active, limit) {
      const used = Number(active) || 0;
      const cap = Number(limit);
      if (Number.isFinite(cap) && cap >= 0) {
        return `${used}/${cap}`;
      }
      return `${used}/0`;
    }

    function formatPercent(v) {
      const num = Number(v);
      if (!Number.isFinite(num)) return '-';
      return `${num.toFixed(2)}%`;
    }

    function formatDate(ms) {
      if (!ms) return '-';
      const d = new Date(Number(ms));
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleString(state.language === 'ar' ? 'ar-EG' : undefined);
    }

    function formatUSD(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '$0';
      const opts = num % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
      return `$${Math.abs(num).toLocaleString(undefined, opts)}`;
    }

    function formatIsoDate(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleDateString(state.language === 'ar' ? 'ar-EG' : undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatAsset(amount, asset) {
      const value = formatNumber(amount);
      if (value === '-') return '-';
      return asset ? `${value} ${asset}` : value;
    }

    function formatSignedCurrency(value, asset) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '-';
      const abs = formatNumber(Math.abs(num));
      const sign = num > 0 ? '+' : num < 0 ? '-' : '';
      return `${sign}${abs}${asset ? ` ${asset}` : ''}`.trim();
    }

    function formatSignedPercent(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '-';
      const abs = Math.abs(num).toFixed(2);
      const sign = num > 0 ? '+' : num < 0 ? '-' : '';
      return `${sign}${abs}%`;
    }

    function parsePartialTargets(input) {
      if (!input) return [];
      const parts = String(input).split(',');
      const steps = [];
      for (const part of parts) {
        if (!part) continue;
        const [portionRaw, profitRaw] = part.split('@');
        const portion = Number.parseFloat(portionRaw);
        const profit = Number.parseFloat(profitRaw);
        if (!(portion > 0) || !(profit > 0)) continue;
        steps.push({ portionPct: portion, profitPct: profit });
      }
      return steps;
    }

    function readIndicatorSettingsFromForm() {
      const intervalEl = document.getElementById('indicatorInterval');
      const rsiPeriodEl = document.getElementById('indicatorRsiPeriod');
      const rsiEntryEl = document.getElementById('indicatorRsiEntry');
      const rsiExitEl = document.getElementById('indicatorRsiExit');
      const macdFastEl = document.getElementById('indicatorMacdFast');
      const macdSlowEl = document.getElementById('indicatorMacdSlow');
      const macdSignalEl = document.getElementById('indicatorMacdSignal');
      const macdEntryEl = document.getElementById('indicatorMacdEntry');
      const macdExitEl = document.getElementById('indicatorMacdExit');

      const macdEntry = (macdEntryEl?.value || 'none').toLowerCase();
      const macdExit = (macdExitEl?.value || 'none').toLowerCase();
      const rsiEntry = Number(rsiEntryEl?.value);
      const rsiExit = Number(rsiExitEl?.value);
      const useRsiEntry = Number.isFinite(rsiEntry) && rsiEntry > 0;
      const useRsiExit = Number.isFinite(rsiExit) && rsiExit > 0;
      const useMacdEntry = macdEntry === 'bullish' || macdEntry === 'bearish';
      const useMacdExit = macdExit === 'bullish' || macdExit === 'bearish';
      if (!useRsiEntry && !useRsiExit && !useMacdEntry && !useMacdExit) {
        return null;
      }

      const clampInt = (value, min, max, fallback) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return fallback;
        const rounded = Math.round(num);
        if (rounded < min) return min;
        if (rounded > max) return max;
        return rounded;
      };
      const clampFloat = (value, min, max) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return null;
        if (num < min) return min;
        if (num > max) return max;
        return Number(num.toFixed(2));
      };

      const interval = (intervalEl?.value || '15m').toLowerCase();
      const rsiPeriod = clampInt(rsiPeriodEl?.value, 2, 100, 14);
      const macdFast = clampInt(macdFastEl?.value, 1, 200, 12);
      let macdSlow = clampInt(macdSlowEl?.value, macdFast + 1, 300, 26);
      if (macdSlow <= macdFast) macdSlow = macdFast + 1;
      const macdSignal = clampInt(macdSignalEl?.value, 1, 100, 9);

      const settings = {
        interval,
        rsiPeriod,
        macdFast,
        macdSlow,
        macdSignal
      };
      if (useRsiEntry) {
        settings.rsiEntryMax = clampFloat(rsiEntry, 0, 100);
      }
      if (useRsiExit) {
        settings.rsiExitMin = clampFloat(rsiExit, 0, 100);
      }
      if (useMacdEntry) {
        settings.macdEntry = macdEntry;
      }
      if (useMacdExit) {
        settings.macdExit = macdExit;
      }
      return settings;
    }

    function formatDuration(ms) {
      const num = Number(ms);
      if (!Number.isFinite(num) || num <= 0) {
        return translate('completed.instant');
      }
      const totalSeconds = Math.floor(num / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const labels = state.language === 'ar'
        ? { day: 'ي', hour: 'س', minute: 'د', second: 'ث' }
        : { day: 'd', hour: 'h', minute: 'm', second: 's' };
      const parts = [];
      if (days) parts.push(`${days}${labels.day}`);
      if (hours) parts.push(`${hours}${labels.hour}`);
      if (minutes) parts.push(`${minutes}${labels.minute}`);
      if (!parts.length && seconds) parts.push(`${seconds}${labels.second}`);
      return parts.length ? parts.slice(0, 2).join(' ') : translate('completed.instant');
    }

    function resolveRuleError(rule) {
      if (!rule) return '';
      if (rule.lastErrorCode === 'symbol_not_whitelisted') {
        return translate('ruleErrors.symbolNotWhitelisted', { symbol: rule.symbol || '' });
      }
      if (typeof rule.lastError === 'string' && rule.lastError.trim()) {
        return rule.lastError.trim();
      }
      return '';
    }

    function announceRuleErrors() {
      const issues = [];
      for (const rule of state.rules || []) {
        const message = resolveRuleError(rule);
        if (message) {
          issues.push({ id: rule.id, message, at: Number(rule.lastErrorAt) || 0 });
        }
      }
      const digest = issues.map(issue => `${issue.id}:${issue.message}:${issue.at}`).join('|');
      if (issues.length && digest !== state.lastRuleErrorsDigest) {
        const focus = issues.reduce((acc, item) => {
          if (!acc || item.at > acc.at) return item;
          return acc;
        }, issues[0]);
        setStatus(focus.message, 'error');
      }
      state.lastRuleErrorsDigest = digest;
    }

    function renderManualRules() {
      const manualRules = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual');
      const ent = state.entitlements || {};
      const manualLimit = Number(ent?.manualLimit);
      const manualEnabled = Boolean(ent && ent.manualEnabled);
      const activeManual = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual' && r.enabled).length;
      manualTableBody.innerHTML = '';
      if (!manualRules.length) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="5">${escapeHtml(translate('manualRules.empty'))}</td>`;
        manualTableBody.appendChild(tr);
        return;
      }
      for (const rule of manualRules) {
        const tr = document.createElement('tr');
        if (!rule.enabled) tr.classList.add('is-paused');
        tr.dataset.id = rule.id;
        const capReached = Number.isFinite(manualLimit) && manualLimit > 0 && activeManual >= manualLimit;
        const toggleDisabled = !manualEnabled || (!rule.enabled && capReached);
        const manualError = resolveRuleError(rule);
        const manualErrorHtml = manualError ? `<div class="rule-error">${escapeHtml(manualError)}</div>` : '';
        const steps = Array.isArray(rule.takeProfitSteps) ? rule.takeProfitSteps.filter(step => Number(step?.profitPct) > 0) : [];
        let targetsHtml = `<div>${escapeHtml(translate('manualRules.buyOnDipLabel'))} <strong>${escapeHtml(formatPercent(rule.dipPct))}</strong></div>`;
        if (steps.length) {
          targetsHtml += `<div class="muted small">${escapeHtml(translate('manual.partialsLabel'))}</div>`;
          steps.forEach(step => {
            const portion = formatPercent(step.portionPct);
            const profit = formatSignedPercent(step.profitPct);
            targetsHtml += `<div class="muted small">${escapeHtml(portion)} → ${escapeHtml(profit)}</div>`;
          });
        } else {
          targetsHtml += `<div class="muted small">${escapeHtml(translate('manualRules.takeProfitLabel'))} ${escapeHtml(formatPercent(rule.tpPct))}</div>`;
        }
        const riskParts = [];
        if (Number(rule.stopLossPct) > 0) {
          riskParts.push(`${translate('manual.stopLabel')} ${formatPercent(rule.stopLossPct)}`);
        }
        if (Number(rule.trailingStopPct) > 0) {
          riskParts.push(`${translate('manual.trailingLabel')} ${formatPercent(rule.trailingStopPct)}`);
        }
        if (riskParts.length) {
          targetsHtml += `<div class="muted small">${escapeHtml(riskParts.join(' • '))}</div>`;
        }
        const indicators = rule.indicatorSettings || {};
        if (indicators && typeof indicators === 'object') {
          const indicatorParts = [];
          if (indicators.interval) {
            indicatorParts.push(`${translate('manualRules.intervalLabel')} ${escapeHtml(String(indicators.interval).toUpperCase())}`);
          }
          const rsiDetails = [];
          if (Number(indicators.rsiEntryMax) > 0) {
            rsiDetails.push(`${translate('manualRules.entryLabel')} ≤ ${formatNumber(indicators.rsiEntryMax)}`);
          }
          if (Number(indicators.rsiExitMin) > 0) {
            rsiDetails.push(`${translate('manualRules.exitLabel')} ≥ ${formatNumber(indicators.rsiExitMin)}`);
          }
          if (rsiDetails.length) {
            indicatorParts.push(`${translate('manualRules.rsiLabel')} ${rsiDetails.join(' · ')}`);
          }
          const macdDetails = [];
          if (typeof indicators.macdEntry === 'string') {
            const key = indicators.macdEntry === 'bearish' ? 'manualRules.macdBearish' : 'manualRules.macdBullish';
            macdDetails.push(`${translate('manualRules.entryLabel')} ${translate(key)}`);
          }
          if (typeof indicators.macdExit === 'string') {
            const key = indicators.macdExit === 'bearish' ? 'manualRules.macdBearish' : 'manualRules.macdBullish';
            macdDetails.push(`${translate('manualRules.exitLabel')} ${translate(key)}`);
          }
          if (macdDetails.length) {
            indicatorParts.push(`${translate('manualRules.macdLabel')} ${macdDetails.join(' · ')}`);
          }
          if (indicatorParts.length) {
            targetsHtml += `<div class="muted small">${escapeHtml(translate('manualRules.indicatorsLabel'))} ${escapeHtml(indicatorParts.join(' | '))}</div>`;
          }
        }
        tr.innerHTML = `
          <td data-label="${escapeHtml(translate('manual.table.rule'))}">
            <div class="symbol">${escapeHtml(rule.symbol)}</div>
            ${manualErrorHtml}
          </td>
          <td data-label="${escapeHtml(translate('manual.table.targets'))}">
            ${targetsHtml}
          </td>
          <td data-label="${escapeHtml(translate('manual.table.budget'))}">${formatCurrency(rule.budgetUSDT)}</td>
          <td data-label="${escapeHtml(translate('manual.table.status'))}">
            <label class="switch">
              <input type="checkbox" data-action="toggle" data-id="${rule.id}" ${rule.enabled ? 'checked' : ''} ${toggleDisabled ? 'disabled' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td data-label="${escapeHtml(translate('manual.table.actions'))}">
            <button class="btn-text danger" data-action="delete" data-id="${rule.id}">${escapeHtml(translate('common.delete'))}</button>
          </td>
        `;
        manualTableBody.appendChild(tr);
      }
    }

    function renderAiRules() {
      const aiRules = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai');
      const ent = state.entitlements || {};
      const aiLimit = Number(ent?.aiLimit);
      const aiEnabled = Boolean(ent && ent.aiEnabled);
      const activeAi = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai' && r.enabled).length;
      aiTableBody.innerHTML = '';
      if (!aiRules.length) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="6">${escapeHtml(translate('aiRules.empty'))}</td>`;
        aiTableBody.appendChild(tr);
        return;
      }
      for (const rule of aiRules) {
        const tr = document.createElement('tr');
        if (!rule.enabled) tr.classList.add('is-paused');
        tr.dataset.id = rule.id;
        const aiError = resolveRuleError(rule);
        const aiErrorHtml = aiError ? `<div class="rule-error">${escapeHtml(aiError)}</div>` : '';
        const capReached = Number.isFinite(aiLimit) && aiLimit > 0 && activeAi >= aiLimit;
        const toggleDisabled = !aiEnabled || (!rule.enabled && capReached);
        tr.innerHTML = `
          <td data-label="${escapeHtml(translate('ai.table.rule'))}">
            <div class="symbol">${escapeHtml(rule.symbol)}</div>
            ${aiErrorHtml}
            <details class="ai-details">
              <summary>${escapeHtml(translate('aiRules.summaryToggle'))}</summary>
              <div class="ai-summary">${escapeHtml(rule.aiSummary || '')}</div>
            </details>
          </td>
          <td data-label="${escapeHtml(translate('ai.table.entry'))}">${formatNumber(rule.entryPrice)}</td>
          <td data-label="${escapeHtml(translate('ai.table.exit'))}">${formatNumber(rule.exitPrice)}</td>
          <td data-label="${escapeHtml(translate('ai.table.budget'))}">${formatCurrency(rule.budgetUSDT)}</td>
          <td data-label="${escapeHtml(translate('ai.table.status'))}">
            <label class="switch">
              <input type="checkbox" data-action="toggle" data-id="${rule.id}" ${rule.enabled ? 'checked' : ''} ${toggleDisabled ? 'disabled' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td data-label="${escapeHtml(translate('ai.table.actions'))}">
            <button class="btn-text danger" data-action="delete" data-id="${rule.id}">${escapeHtml(translate('common.delete'))}</button>
          </td>
        `;
        aiTableBody.appendChild(tr);
      }
    }

    function renderOrders(rows) {
      currentOrdersCache = Array.isArray(rows) ? rows : [];
      ordersTableBody.innerHTML = '';
      if (!currentOrdersCache.length) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="7">${escapeHtml(translate('orders.empty'))}</td>`;
        ordersTableBody.appendChild(tr);
        return;
      }
      for (const item of currentOrdersCache) {
        if (item.error) {
          const tr = document.createElement('tr');
          tr.className = 'empty-row';
          tr.innerHTML = `<td colspan="7">${escapeHtml(item.symbol)}: ${escapeHtml(item.error)}</td>`;
          ordersTableBody.appendChild(tr);
          continue;
        }
        for (const order of item.orders || []) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td data-label="${escapeHtml(translate('orders.table.symbol'))}">${escapeHtml(order.symbol)}</td>
            <td data-label="${escapeHtml(translate('orders.table.side'))}"><span class="pill ${order.side === 'BUY' ? 'success' : 'danger'}">${order.side}</span></td>
            <td data-label="${escapeHtml(translate('orders.table.price'))}">${formatNumber(order.price)}</td>
            <td data-label="${escapeHtml(translate('orders.table.qty'))}">${formatNumber(order.origQty)}</td>
            <td data-label="${escapeHtml(translate('orders.table.type'))}">${escapeHtml(order.type)}</td>
            <td data-label="${escapeHtml(translate('orders.table.status'))}">${escapeHtml(order.status)}</td>
            <td data-label="${escapeHtml(translate('orders.table.updated'))}">${formatDate(order.updateTime || order.time)}</td>
          `;
          ordersTableBody.appendChild(tr);
        }
      }
    }

    function renderCompletedTrades(rows, errors = []) {
      state.completedTrades = Array.isArray(rows) ? rows : [];
      state.completedTradesErrors = Array.isArray(errors) ? errors : [];

      if (completedTradesNotice) {
        if (state.completedTradesErrors.length) {
          completedTradesNotice.textContent = state.completedTradesErrors.join(' • ');
          completedTradesNotice.classList.add('visible');
        } else {
          completedTradesNotice.textContent = '';
          completedTradesNotice.classList.remove('visible');
        }
      }

      if (!completedTradesList) return;
      completedTradesList.innerHTML = '';

      if (!state.completedTrades.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = translate('completed.empty');
        completedTradesList.appendChild(empty);
        return;
      }

      for (const trade of state.completedTrades) {
        if (!trade || typeof trade !== 'object') continue;
        const profitClass = trade.profit > 0 ? 'positive' : trade.profit < 0 ? 'negative' : 'neutral';
        const card = document.createElement('article');
        card.className = 'trade-card';
        const quantity = formatAsset(trade.quantity, trade.baseAsset);
        const buyPrice = formatAsset(trade.buyPrice, trade.quoteAsset);
        const sellPrice = formatAsset(trade.sellPrice, trade.quoteAsset);
        const profitValue = formatSignedCurrency(trade.profit, trade.quoteAsset);
        const profitPercent = formatSignedPercent(trade.profitPct);
        const returnLabel = translate('completed.labels.return');
        const returnDisplay = profitPercent === '-' ? returnLabel : `${returnLabel} · ${profitPercent}`;
        const openedAt = formatDate(trade.openedAt);
        const closedAt = formatDate(trade.closedAt);
        const duration = formatDuration(trade.durationMs);
        card.innerHTML = `
          <div class="trade-card-header">
            <div class="trade-title">
              <span class="trade-symbol">${escapeHtml(trade.symbol || '')}</span>
              <span class="trade-chip">${escapeHtml(translate('completed.status'))}</span>
            </div>
            <span class="trade-closed">${escapeHtml(translate('completed.closed'))} ${escapeHtml(closedAt)}</span>
          </div>
          <div class="trade-card-body">
            <div class="metric">
              <span class="label">${escapeHtml(translate('completed.labels.quantity'))}</span>
              <span class="value">${escapeHtml(quantity)}</span>
            </div>
            <div class="metric">
              <span class="label">${escapeHtml(translate('completed.labels.avgBuy'))}</span>
              <span class="value">${escapeHtml(buyPrice)}</span>
            </div>
            <div class="metric">
              <span class="label">${escapeHtml(translate('completed.labels.avgSell'))}</span>
              <span class="value">${escapeHtml(sellPrice)}</span>
            </div>
            <div class="metric profit ${profitClass}">
              <span class="label">${escapeHtml(translate('completed.labels.profit'))}</span>
              <span class="value">${escapeHtml(profitValue)}</span>
              <span class="subvalue">${escapeHtml(returnDisplay)}</span>
            </div>
          </div>
          <div class="trade-card-footer">
            <span>${escapeHtml(translate('completed.opened'))} ${escapeHtml(openedAt)}</span>
            <span>${escapeHtml(translate('completed.duration'))} ${escapeHtml(duration)}</span>
          </div>
        `;
        completedTradesList.appendChild(card);
      }
    }

    function renderPerformanceMetrics(metrics) {
      if (!performanceMetricsEl) return;
      if (metrics !== undefined) {
        state.performanceMetrics = metrics && typeof metrics === 'object' ? metrics : null;
      }
      const data = state.performanceMetrics;
      performanceMetricsEl.innerHTML = '';
      if (!data || !Number(data.totalTrades)) {
        return;
      }

      const quoteAsset = data.bestTrade?.quoteAsset
        || data.worstTrade?.quoteAsset
        || (state.completedTrades[0]?.quoteAsset || 'USDT');

      const createMetricCard = (labelKey, value, trendClass = '', detail) => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        const label = document.createElement('span');
        label.className = 'metric-label';
        label.textContent = translate(labelKey);
        const valueEl = document.createElement('span');
        valueEl.className = 'metric-value';
        valueEl.textContent = value;
        if (trendClass) {
          valueEl.classList.add(trendClass);
        }
        card.appendChild(label);
        card.appendChild(valueEl);
        if (detail) {
          const detailEl = document.createElement('span');
          detailEl.className = `metric-trend ${trendClass || ''}`.trim();
          detailEl.textContent = detail;
          card.appendChild(detailEl);
        }
        return card;
      };

      const cards = [];
      const totalProfitTrend = data.totalProfit > 0 ? 'positive' : data.totalProfit < 0 ? 'negative' : '';
      cards.push(createMetricCard('analytics.totalProfit', formatSignedCurrency(data.totalProfit, quoteAsset), totalProfitTrend));
      const avgReturnTrend = data.averageProfitPct > 0 ? 'positive' : data.averageProfitPct < 0 ? 'negative' : '';
      cards.push(createMetricCard('analytics.averageReturn', formatSignedPercent(data.averageProfitPct), avgReturnTrend));
      cards.push(createMetricCard('analytics.winRate', formatPercent(data.winRate), data.winRate >= 50 ? 'positive' : ''));
      cards.push(createMetricCard('analytics.totalTrades', String(data.totalTrades)));
      cards.push(createMetricCard('analytics.avgHold', formatDuration(data.averageHoldMs)));

      if (data.bestTrade) {
        const bestTrend = data.bestTrade.profit > 0 ? 'positive' : data.bestTrade.profit < 0 ? 'negative' : '';
        const detail = `${data.bestTrade.symbol || ''} · ${formatSignedPercent(data.bestTrade.profitPct)}`;
        cards.push(createMetricCard(
          'analytics.bestTrade',
          formatSignedCurrency(data.bestTrade.profit, data.bestTrade.quoteAsset || quoteAsset),
          bestTrend,
          detail
        ));
      }

      if (data.worstTrade) {
        const worstTrend = data.worstTrade.profit > 0 ? 'positive' : data.worstTrade.profit < 0 ? 'negative' : '';
        const detail = `${data.worstTrade.symbol || ''} · ${formatSignedPercent(data.worstTrade.profitPct)}`;
        cards.push(createMetricCard(
          'analytics.worstTrade',
          formatSignedCurrency(data.worstTrade.profit, data.worstTrade.quoteAsset || quoteAsset),
          worstTrend,
          detail
        ));
      }

      for (const card of cards) {
        performanceMetricsEl.appendChild(card);
      }
    }

    function renderSecuritySettings() {
      const security = state.security || defaultSecurityState();
      if (alertEmailInput) {
        alertEmailInput.value = security.alertEmail || '';
      }
      if (alertWebhookInput) {
        alertWebhookInput.value = security.alertWebhookUrl || '';
      }
      if (alertTelegramInput) {
        alertTelegramInput.value = security.alertTelegramChat || '';
      }
      if (mfaStatusText) {
        const key = security.mfaEnabled ? 'security.mfaEnabledStatus' : 'security.mfaDisabled';
        mfaStatusText.textContent = translate(key);
      }
      if (setupMfaBtn) {
        setupMfaBtn.disabled = !state.token || security.mfaEnabled;
      }
      if (enableMfaBtn) {
        enableMfaBtn.disabled = !state.token || security.mfaEnabled;
      }
      if (disableMfaBtn) {
        disableMfaBtn.disabled = !state.token || !security.mfaEnabled;
      }
      if (confirmMfaBtn) {
        confirmMfaBtn.disabled = !state.token || !security.mfaPanelOpen;
        confirmMfaBtn.dataset.mode = security.mfaMode || 'enable';
      }
      if (mfaSecretPanel) {
        const shouldShow = Boolean(security.mfaPanelOpen && (security.mfaSecret || security.mfaConfigured || security.mfaEnabled));
        mfaSecretPanel.classList.toggle('hidden', !shouldShow);
      }
      if (mfaSecretValue) {
        if (security.showSecret && security.mfaSecret) {
          mfaSecretValue.textContent = security.mfaSecret;
        } else {
          mfaSecretValue.textContent = '••••••';
        }
      }
    }

    function renderLoginMfa() {
      if (!loginMfaRow) return;
      loginMfaRow.classList.toggle('hidden', !state.loginMfaRequired);
    }

    function updateEntitlementsFromResponse(payload) {
      if (!payload) return;
      if (payload.subscription) {
        updateEntitlements(payload.subscription);
        return;
      }
      if (payload.entitlements) {
        updateEntitlements(payload.entitlements);
      }
    }

    function updateEntitlements(entitlements) {
      if (entitlements && typeof entitlements === 'object') {
        state.entitlements = entitlements;
      } else {
        state.entitlements = null;
      }
      renderSubscription();
      renderDashboardPlans();
      renderPricingCards();
      applyEntitlementsUI();
    }

    function applyEntitlementsUI() {
      const ent = state.entitlements || {};
      const hasPlan = Boolean(ent && ent.plan);
      const manualEnabled = Boolean(state.token && ent && ent.manualEnabled);
      const aiEnabled = Boolean(state.token && ent && ent.aiEnabled);
      const manualLimit = Number(ent?.manualLimit);
      const aiLimit = Number(ent?.aiLimit);
      const activeManual = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual' && r.enabled).length;
      const activeAi = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai' && r.enabled).length;
      const manualCapReached = manualEnabled && Number.isFinite(manualLimit) && manualLimit >= 0 && activeManual >= manualLimit;
      const aiCapReached = aiEnabled && Number.isFinite(aiLimit) && aiLimit >= 0 && activeAi >= aiLimit;

      if (manualCountEl) {
        manualCountEl.textContent = formatUsageCount(activeManual, manualLimit);
      }
      if (aiCountEl) {
        aiCountEl.textContent = formatUsageCount(activeAi, aiLimit);
      }

      if (manualForm) {
        const inputs = manualForm.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.disabled = !manualEnabled;
        });
        const submit = manualForm.querySelector('button[type="submit"]');
        if (submit) {
          submit.disabled = !manualEnabled || manualCapReached;
        }
      }

      if (manualRestriction) {
        manualRestriction.classList.remove('visible', 'info');
        manualRestriction.textContent = '';
        let message = '';
        let info = false;
        if (!state.token) {
          message = translate('subscription.loginRequired');
        } else if (!hasPlan) {
          message = ent && ent.pending && ent.pending.plan
            ? translate('subscription.renewing')
            : translate('subscription.noPlan');
        } else if (!manualEnabled) {
          message = translate('status.manualLocked');
        } else if (manualCapReached && Number.isFinite(manualLimit) && manualLimit >= 0) {
          message = translate('status.manualLimit', { count: manualLimit });
          info = true;
        }
        if (message) {
          manualRestriction.textContent = message;
          manualRestriction.classList.add('visible');
          if (info) manualRestriction.classList.add('info');
        }
      }

      if (aiBudgetInput) {
        aiBudgetInput.disabled = !aiEnabled;
      }
      if (aiModelInput) {
        aiModelInput.disabled = true;
      }
      if (aiGenerateBtn) {
        const loading = aiGenerateBtn.dataset.loading === 'true';
        aiGenerateBtn.disabled = loading || !aiEnabled || aiCapReached;
      }

      if (aiRestriction) {
        aiRestriction.classList.remove('visible', 'info');
        aiRestriction.textContent = '';
        let message = '';
        let info = false;
        if (!state.token) {
          message = translate('subscription.loginRequired');
        } else if (!hasPlan) {
          message = ent && ent.pending && ent.pending.plan
            ? translate('subscription.renewing')
            : translate('subscription.noPlan');
        } else if (!aiEnabled) {
          message = translate('status.aiLocked');
        } else if (aiCapReached && Number.isFinite(aiLimit) && aiLimit >= 0) {
          message = translate('status.aiLimit', { count: aiLimit });
          info = true;
        }
        if (message) {
          aiRestriction.textContent = message;
          aiRestriction.classList.add('visible');
          if (info) aiRestriction.classList.add('info');
        }
      }
    }

    function renderPlanGrid(container, context) {
      if (!container) return;
      container.innerHTML = '';
      const plans = Array.isArray(state.plans) ? state.plans : [];
      if (!plans.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = translate('subscription.noPlans');
        container.appendChild(empty);
        return;
      }
      const ent = state.entitlements || {};
      const currentPlanId = ent.plan ? Number(ent.plan.id) : null;
      const pendingPlanId = ent && ent.pending && ent.pending.plan ? Number(ent.pending.plan.id) : null;
      const availableProviders = state.providers || {};
      const isAuthenticated = Boolean(state.token && state.user);
      for (const plan of plans) {
        const card = document.createElement('article');
        card.className = 'plan-card';
        const isCurrent = currentPlanId !== null && Number(plan.id) === currentPlanId;
        const isPending = pendingPlanId !== null && Number(plan.id) === pendingPlanId;
        if (isCurrent) card.classList.add('current');
        if (isPending) card.classList.add('pending');
        const manualLimit = Number(plan.manualLimit);
        const aiLimit = Number(plan.aiLimit);
        const manualText = plan.manualEnabled
          ? (Number.isFinite(manualLimit) && manualLimit > 0
              ? translate('pricing.manualFeature', { count: manualLimit })
              : translate('subscription.manualUnlimited'))
          : translate('subscription.manualDisabled');
        const aiText = plan.aiEnabled
          ? (Number.isFinite(aiLimit) && aiLimit > 0
              ? translate('pricing.aiFeature', { count: aiLimit })
              : translate('subscription.aiUnlimited'))
          : translate('pricing.aiDisabled');
        const durationText = translate('pricing.duration', { days: plan.durationDays });
        const headerParts = [];
        const badges = [];
        const entStatus = (ent.status || '').toLowerCase();
        if (isCurrent && entStatus === 'active') {
          badges.push(`<span class="plan-badge">${escapeHtml(translate('subscription.statusActive'))}</span>`);
        }
        if (isPending) {
          badges.push(`<span class="plan-badge">${escapeHtml(translate('subscription.statusPending'))}</span>`);
        }
        if (badges.length) {
          headerParts.push(badges.join(''));
        }
        headerParts.push(`<h3>${escapeHtml(plan.name)}</h3>`);
        if (plan.description) {
          headerParts.push(`<p class="muted">${escapeHtml(plan.description)}</p>`);
        }
        card.innerHTML = `
          <div>
            ${headerParts.join('')}
            <div class="plan-price">${escapeHtml(formatUSD(plan.priceUSD))}<span>${escapeHtml(durationText)}</span></div>
          </div>
          <ul class="plan-feature-list">
            <li>${escapeHtml(manualText)}</li>
            <li>${escapeHtml(aiText)}</li>
            <li>${escapeHtml(durationText)}</li>
          </ul>
        `;
        const actions = document.createElement('div');
        actions.className = 'plan-actions';
        const providers = [];
        if (availableProviders.stripe) providers.push({ provider: 'stripe', label: translate('subscription.payWithStripe') });
        if (availableProviders.cryptomus) providers.push({ provider: 'cryptomus', label: translate('subscription.payWithCryptomus') });
        if (!isAuthenticated) {
          const note = document.createElement('p');
          note.className = 'provider-label';
          note.textContent = translate('subscription.loginRequired');
          actions.appendChild(note);
        } else if (isCurrent && entStatus === 'active' && !isPending) {
          const note = document.createElement('p');
          note.className = 'provider-label';
          note.textContent = translate('subscription.statusActive');
          actions.appendChild(note);
        } else if (isPending) {
          const note = document.createElement('p');
          note.className = 'provider-label';
          note.textContent = translate('subscription.statusPending');
          actions.appendChild(note);
        } else if (!providers.length) {
          const note = document.createElement('p');
          note.className = 'provider-label';
          note.textContent = translate('status.checkoutError');
          actions.appendChild(note);
        } else {
          for (const item of providers) {
            const btn = document.createElement('button');
            btn.className = item.provider === 'stripe' ? 'btn primary' : 'btn ghost';
            btn.type = 'button';
            btn.dataset.action = 'checkout';
            btn.dataset.planId = plan.id;
            btn.dataset.provider = item.provider;
            btn.textContent = item.label;
            actions.appendChild(btn);
          }
        }
        card.appendChild(actions);
        container.appendChild(card);
      }
    }

    function renderPricingCards() {
      renderPlanGrid(pricingGrid, 'landing');
    }

    function renderDashboardPlans() {
      renderPlanGrid(dashboardPlansGrid, 'dashboard');
    }

    function renderSubscription() {
      if (!subscriptionCard) return;
      const ent = state.entitlements || null;
      const pending = ent && ent.pending ? ent.pending : null;
      if (subscriptionActions) {
        subscriptionActions.innerHTML = '';
      }
      if (!ent || !ent.plan) {
        subscriptionStatus.textContent = ent && pending ? translate('subscription.statusPending') : translate('subscription.statusNone');
        subscriptionStatus.className = `status-pill${pending ? ' pending' : ' expired'}`;
        subscriptionSummary.innerHTML = `<p class="subscription-meta">${escapeHtml(translate('subscription.noPlan'))}</p>`;
        subscriptionFeaturesEl.innerHTML = '';
        subscriptionWarning.classList.remove('visible', 'info');
        subscriptionWarning.textContent = '';
        if (subscriptionActions) {
          const note = document.createElement('p');
          note.className = 'muted';
          note.textContent = translate(
            pending && pending.plan
              ? 'subscription.renewing'
              : (state.token ? 'subscription.noPlan' : 'subscription.loginRequired')
          );
          subscriptionActions.appendChild(note);
        }
      } else {
        let statusKey = ent.status || 'active';
        if (statusKey === 'pending' || (pending && (!ent.plan || Number(pending.id) !== Number(ent.plan.id)))) {
          statusKey = 'pending';
        }
        let statusClass = 'status-pill';
        if (statusKey === 'pending') statusClass += ' pending';
        else if (statusKey === 'expired') statusClass += ' expired';
        subscriptionStatus.textContent = translate(`subscription.status${statusKey.charAt(0).toUpperCase()}${statusKey.slice(1)}`);
        subscriptionStatus.className = statusClass;
        const summaryParts = [];
        summaryParts.push(`<strong>${escapeHtml(translate('subscription.currentPlan', { name: ent.plan.name }))}</strong>`);
        if (ent.expiresAt) {
          summaryParts.push(`<span class="subscription-meta">${escapeHtml(translate('subscription.expires', { date: formatIsoDate(ent.expiresAt) }))}</span>`);
        }
        if (Number.isFinite(Number(ent.remainingDays)) && Number(ent.remainingDays) >= 0) {
          const days = Number(ent.remainingDays);
          const key = days === 1 ? 'subscription.daysLeftOne' : 'subscription.daysLeft';
          summaryParts.push(`<span class="subscription-meta">${escapeHtml(translate(key, { count: days }))}</span>`);
        }
        subscriptionSummary.innerHTML = summaryParts.join(' ');
        const activeManual = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual' && r.enabled).length;
        const activeAi = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai' && r.enabled).length;
        const manualLimit = Number(ent.manualLimit);
        const aiLimit = Number(ent.aiLimit);
        const manualText = ent.manualEnabled !== false
          ? (Number.isFinite(manualLimit) && manualLimit > 0
              ? translate('subscription.manualFeature', { used: activeManual, limit: manualLimit })
              : translate('subscription.manualUnlimited'))
          : translate('subscription.manualDisabled');
        const aiText = ent.aiEnabled !== false
          ? (Number.isFinite(aiLimit) && aiLimit > 0
              ? translate('subscription.aiFeature', { used: activeAi, limit: aiLimit })
              : translate('subscription.aiUnlimited'))
          : translate('subscription.aiDisabled');
        subscriptionFeaturesEl.innerHTML = `
          <span class="feature${ent.manualEnabled !== false ? '' : ' disabled'}">${escapeHtml(manualText)}</span>
          <span class="feature${ent.aiEnabled !== false ? '' : ' disabled'}">${escapeHtml(aiText)}</span>
        `;
        if (pending && pending.plan) {
          subscriptionWarning.textContent = translate('subscription.pendingNotice', { name: pending.plan.name });
          subscriptionWarning.classList.add('visible', 'info');
        } else {
          subscriptionWarning.classList.remove('visible', 'info');
          subscriptionWarning.textContent = '';
        }
        if (subscriptionActions) {
          if (statusKey === 'pending' || (pending && pending.plan)) {
            const note = document.createElement('p');
            note.className = 'muted';
            note.textContent = translate('subscription.renewing');
            subscriptionActions.appendChild(note);
          }
        }
      }

      const history = state.entitlements && Array.isArray(state.entitlements.history) ? state.entitlements.history : [];
      subscriptionHistory.innerHTML = '';
      if (!history.length) {
        const item = document.createElement('li');
        item.textContent = translate('subscription.historyEmpty');
        subscriptionHistory.appendChild(item);
      } else {
        for (const entry of history) {
          const li = document.createElement('li');
          const statusKey = entry.status ? entry.status.toLowerCase() : '';
          const labelKey = statusKey === 'active'
            ? 'subscription.statusActive'
            : statusKey === 'pending'
              ? 'subscription.statusPending'
              : statusKey === 'expired'
                ? 'subscription.statusExpired'
                : 'subscription.statusNone';
          const label = document.createElement('span');
          label.className = 'label';
          label.textContent = `${entry.plan?.name || ''}`.trim();
          const meta = document.createElement('span');
          meta.className = 'meta';
          const date = entry.updatedAt || entry.startedAt || entry.createdAt || entry.expiresAt;
          meta.textContent = `${translate(labelKey)} · ${formatIsoDate(date)}`;
          li.appendChild(label);
          li.appendChild(meta);
          subscriptionHistory.appendChild(li);
        }
      }
    }

    async function startCheckout(planId, provider, trigger) {
      if (!planId || !provider) return;
      if (!state.token || !state.user) {
        setStatus(translate('subscription.loginRequired'), 'error');
        renderPricingCards();
        renderDashboardPlans();
        showLanding();
        return;
      }
      const pendingPlanId = state.entitlements?.pending?.plan?.id;
      if (pendingPlanId && Number(pendingPlanId) === Number(planId)) {
        const pendingName = state.entitlements?.pending?.plan?.name || '';
        if (pendingName) {
          setStatus(translate('subscription.pendingNotice', { name: pendingName }), 'info');
        } else {
          setStatus(translate('subscription.renewing'), 'info');
        }
        return;
      }
      if (trigger) {
        if (trigger.dataset.loading === 'true') return;
        trigger.dataset.loading = 'true';
        trigger.disabled = true;
      }
      try {
        setStatus(translate('status.checkoutStarted'), 'info');
        const response = await api('/api/billing/checkout', {
          method: 'POST',
          body: { planId: Number(planId), provider }
        });
        updateEntitlementsFromResponse(response);
        const url = response?.checkout?.url;
        if (url) {
          window.location.href = url;
          return;
        }
        setStatus(translate('status.checkoutError'), 'error');
      } catch (err) {
        console.error('checkout error', err);
        setStatus(err.message || translate('status.checkoutError'), 'error');
      } finally {
        if (trigger) {
          trigger.disabled = false;
          delete trigger.dataset.loading;
        }
      }
    }

    async function refreshRuleErrors() {
      try {
        const data = await api('/api/rules/errors');
        const list = Array.isArray(data?.errors) ? data.errors : [];
        const map = new Map(list.map(item => [item.id, item]));
        let changed = false;
        const nextRules = state.rules.map(rule => {
          const entry = map.get(rule.id);
          if (entry) {
            const message = typeof entry.message === 'string' ? entry.message.trim() : '';
            const code = entry.code || undefined;
            const createdAt = Number(entry.createdAt) || Date.now();
            const nextMessage = message || undefined;
            const nextCode = code || undefined;
            const nextAt = createdAt;
            if (rule.lastError !== nextMessage || rule.lastErrorCode !== nextCode || Number(rule.lastErrorAt || 0) !== nextAt) {
              changed = true;
              return { ...rule, lastError: nextMessage, lastErrorCode: nextCode, lastErrorAt: nextAt };
            }
            return rule;
          }
          if (rule.lastError || rule.lastErrorCode || rule.lastErrorAt) {
            changed = true;
            const next = { ...rule };
            delete next.lastError;
            delete next.lastErrorCode;
            delete next.lastErrorAt;
            return next;
          }
          return rule;
        });
        if (changed) {
          state.rules = nextRules;
          renderTables();
        }
      } catch (err) {
        console.error('rule errors refresh failed', err);
      }
    }

    async function handleLogin(event) {
      event.preventDefault();
      const payload = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      };
      const mfaTokenValue = loginMfaInput ? loginMfaInput.value.trim() : '';
      if (mfaTokenValue) {
        payload.mfaToken = mfaTokenValue;
      }
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.mfaRequired) {
            state.loginMfaRequired = true;
            renderLoginMfa();
            if (loginMfaInput) {
              loginMfaInput.value = '';
              loginMfaInput.focus();
            }
            const key = typeof data.error === 'string' && data.error.toLowerCase().includes('invalid')
              ? 'status.mfaInvalid'
              : 'status.mfaRequired';
            throw new Error(translate(key));
          }
          throw new Error(data.error || 'Login failed');
        }
        setToken(data.token);
        state.user = data.user;
        state.loginMfaRequired = false;
        renderLoginMfa();
        if (loginMfaInput) {
          loginMfaInput.value = '';
        }
        await bootstrapDashboard();
        setStatus(translate('status.loginSuccess'), 'success');
      } catch (err) {
        console.error('login error', err);
        setStatus(err.message, 'error');
      }
    }

    async function handleRegister(event) {
      event.preventDefault();
      const payload = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
      };
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setToken(data.token);
        state.user = data.user;
        await bootstrapDashboard();
        setStatus(translate('status.registerSuccess'), 'success');
      } catch (err) {
        console.error('register error', err);
        setStatus(err.message, 'error');
      }
    }

    async function bootstrapDashboard() {
      try {
        await fetchCurrentUser();
        showDashboard();
        await loadPlans();
        await loadRules();
        await loadOrders();
        await loadCompletedTrades(true);
        await loadSecuritySettings();
        await refreshApiKeysStatus();
        if (state.ordersTimer) clearInterval(state.ordersTimer);
        state.ordersTimer = setInterval(() => loadOrders(true), 8000);
      } catch (err) {
        console.error('bootstrap error', err);
        if (err && err.message === 'Unauthorized') {
          handleLogout();
          return;
        }
        setStatus(err.message, 'error');
      }
    }

    async function fetchCurrentUser() {
      const data = await api('/api/auth/me');
      state.user = data.user;
      state.hasKeys = Boolean(data.hasApiKeys);
      updateEntitlementsFromResponse(data);
      const greeting = state.user?.name ? `${translate('dashboard.welcome')} ${state.user.name}` : translate('dashboard.welcome');
      welcomeName.textContent = greeting;
      updateApiKeysStatus();
    }

    async function loadRules() {
      try {
        const data = await api('/api/rules');
        state.rules = extractRules(data);
        updateEntitlementsFromResponse(data);
        renderTables();
      } catch (err) {
        console.error('load rules error', err);
        state.rules = Array.isArray(state.rules) ? state.rules : [];
        renderTables();
        throw err;
      }
    }

    async function persistAll(rules, message) {
      const response = await api('/api/rules', { method: 'POST', body: rules });
      state.rules = extractRules(response);
      updateEntitlementsFromResponse(response);
      renderTables();
      if (message) setStatus(message.text, message.type || 'success');
    }

    async function loadOrders(silent) {
      if (state.isOrdersLoading) return;
      state.isOrdersLoading = true;
      try {
        const data = await api('/api/orders');
        renderOrders(Array.isArray(data) ? data : []);
        if (!silent) setStatus(translate('status.ordersRefreshed'), 'info');
      } catch (err) {
        renderOrders([]);
        setStatus(err.message, 'error');
      } finally {
        await refreshRuleErrors();
        state.isOrdersLoading = false;
      }
    }

    async function loadCompletedTrades(silent) {
      if (state.isCompletedTradesLoading) return;
      state.isCompletedTradesLoading = true;
      try {
        const data = await api('/api/trades/completed');
        const trades = Array.isArray(data?.trades) ? data.trades : [];
        const errors = Array.isArray(data?.errors) ? data.errors : [];
        renderCompletedTrades(trades, errors);
        renderPerformanceMetrics(data?.metrics || null);
        if (!silent) setStatus(translate('status.completedRefreshed'), 'info');
      } catch (err) {
        console.error('completed trades error', err);
        renderCompletedTrades([], [err.message]);
        renderPerformanceMetrics(null);
        setStatus(err.message, 'error');
      } finally {
        state.isCompletedTradesLoading = false;
      }
    }

    async function loadSecuritySettings() {
      if (!state.token) {
        state.security = defaultSecurityState();
        renderSecuritySettings();
        return;
      }
      try {
        const data = await api('/api/security/settings');
        const secret = data?.mfaSecret || null;
        state.security = {
          ...defaultSecurityState(),
          ...state.security,
          alertEmail: data?.alertEmail || '',
          alertWebhookUrl: data?.alertWebhookUrl || '',
          alertTelegramChat: data?.alertTelegramChat || '',
          preferences: data?.preferences || {},
          mfaEnabled: Boolean(data?.mfaEnabled),
          mfaConfigured: Boolean(data?.mfaConfigured || secret),
          mfaSecret: data?.mfaEnabled ? null : (secret || state.security?.mfaSecret || null),
          otpauth: data?.otpauth || state.security?.otpauth || null,
          mfaPanelOpen: false,
          showSecret: false,
          mfaMode: 'enable'
        };
        renderSecuritySettings();
      } catch (err) {
        console.error('security settings load error', err);
      }
    }

    async function submitAlertSettings(event) {
      event.preventDefault();
      if (!state.token) {
        setStatus(translate('subscription.loginRequired'), 'error');
        return;
      }
      const payload = {
        alertEmail: alertEmailInput?.value || '',
        alertWebhookUrl: alertWebhookInput?.value || '',
        alertTelegramChat: alertTelegramInput?.value || ''
      };
      try {
        const response = await api('/api/security/alerts', { method: 'POST', body: payload });
        if (response?.settings) {
          state.security = {
            ...state.security,
            alertEmail: response.settings.alertEmail || '',
            alertWebhookUrl: response.settings.alertWebhookUrl || '',
            alertTelegramChat: response.settings.alertTelegramChat || '',
            preferences: response.settings.preferences || state.security.preferences || {}
          };
          renderSecuritySettings();
        }
        setStatus(translate('status.alertsSaved'), 'success');
      } catch (err) {
        console.error('alert settings error', err);
        setStatus(err.message, 'error');
      }
    }

    async function setupMfa() {
      if (!state.token) {
        setStatus(translate('subscription.loginRequired'), 'error');
        return;
      }
      try {
        const data = await api('/api/security/mfa/setup', { method: 'POST' });
        state.security = {
          ...state.security,
          mfaEnabled: false,
          mfaConfigured: Boolean(data?.secret),
          mfaSecret: data?.secret || null,
          otpauth: data?.otpauth || null,
          mfaPanelOpen: true,
          showSecret: true,
          mfaMode: 'enable'
        };
        renderSecuritySettings();
        setStatus(translate('status.mfaSecretGenerated'), 'info');
        if (mfaTokenInput) {
          mfaTokenInput.value = '';
          mfaTokenInput.focus();
        }
      } catch (err) {
        console.error('setup mfa error', err);
        setStatus(err.message, 'error');
      }
    }

    async function openEnableMfa() {
      if (!state.token) {
        setStatus(translate('subscription.loginRequired'), 'error');
        return;
      }
      if (state.security?.mfaEnabled) {
        renderSecuritySettings();
        return;
      }
      if (!state.security?.mfaSecret) {
        await setupMfa();
        return;
      }
      state.security = {
        ...state.security,
        mfaPanelOpen: true,
        showSecret: true,
        mfaMode: 'enable'
      };
      renderSecuritySettings();
      if (mfaTokenInput) mfaTokenInput.focus();
    }

    function openDisableMfa() {
      if (!state.token) {
        setStatus(translate('subscription.loginRequired'), 'error');
        return;
      }
      if (!state.security?.mfaEnabled) {
        return;
      }
      state.security = {
        ...state.security,
        mfaPanelOpen: true,
        showSecret: false,
        mfaMode: 'disable'
      };
      if (mfaTokenInput) {
        mfaTokenInput.value = '';
        mfaTokenInput.focus();
      }
      renderSecuritySettings();
    }

    async function confirmMfaAction() {
      if (!state.token) {
        setStatus(translate('subscription.loginRequired'), 'error');
        return;
      }
      const token = (mfaTokenInput?.value || '').trim();
      if (!token || token.length < 6) {
        setStatus(translate('status.mfaTokenRequired'), 'error');
        if (mfaTokenInput) mfaTokenInput.focus();
        return;
      }
      const mode = (state.security?.mfaMode || confirmMfaBtn?.dataset.mode || 'enable').toLowerCase();
      try {
        if (mode === 'disable') {
          await api('/api/security/mfa/disable', { method: 'POST', body: { token } });
          setStatus(translate('status.mfaDisabled'), 'info');
        } else {
          await api('/api/security/mfa/enable', { method: 'POST', body: { token } });
          setStatus(translate('status.mfaEnabled'), 'success');
        }
        if (mfaTokenInput) {
          mfaTokenInput.value = '';
        }
        state.security = {
          ...state.security,
          mfaPanelOpen: false,
          showSecret: false,
          mfaMode: 'enable'
        };
        await loadSecuritySettings();
      } catch (err) {
        console.error('mfa confirm error', err);
        const message = /invalid mfa token/i.test(err.message || '')
          ? translate('status.mfaInvalid')
          : err.message;
        setStatus(message, 'error');
        if (mfaTokenInput) mfaTokenInput.focus();
      }
    }

    async function refreshApiKeysStatus() {
      try {
        const data = await api('/api/users/api-keys');
        state.hasKeys = Boolean(data.hasKeys);
      } catch (err) {
        state.hasKeys = false;
        console.error('api key status error', err);
      }
      updateApiKeysStatus();
    }

    function updateApiKeysStatus() {
      if (!apiKeysStatus) return;
      const label = state.hasKeys ? 'api.connected' : 'api.disconnected';
      apiKeysStatus.textContent = translate(label);
      apiKeysStatus.className = `pill ${state.hasKeys ? 'success' : 'danger'}`;
    }

    async function submitApiKeys(event) {
      event.preventDefault();
      const payload = {
        apiKey: document.getElementById('apiKey').value,
        apiSecret: document.getElementById('apiSecret').value
      };
      try {
        await api('/api/users/api-keys', { method: 'POST', body: payload });
        state.hasKeys = true;
        updateApiKeysStatus();
        setStatus(translate('status.keysSaved'), 'success');
      } catch (err) {
        console.error('api key save error', err);
        setStatus(err.message, 'error');
      }
    }

    async function removeApiKeys() {
      try {
        await api('/api/users/api-keys', { method: 'DELETE' });
        state.hasKeys = false;
        updateApiKeysStatus();
        setStatus(translate('status.keysRemoved'), 'info');
      } catch (err) {
        console.error('remove keys error', err);
        setStatus(err.message, 'error');
      }
    }

    async function addManualRule(event) {
      event.preventDefault();
      const ent = state.entitlements || {};
      if (!ent || !ent.plan || ent.manualEnabled === false) {
        setStatus(translate('status.manualLocked'), 'error');
        return;
      }
      const manualLimit = Number(ent?.manualLimit);
      const activeManual = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual' && r.enabled).length;
      if (Number.isFinite(manualLimit) && manualLimit > 0 && activeManual >= manualLimit) {
        setStatus(translate('status.manualLimit', { count: manualLimit }), 'error');
        return;
      }
      const rule = {
        id: generateId(),
        type: 'manual',
        symbol: document.getElementById('symbol').value.trim().toUpperCase(),
        dipPct: Number(document.getElementById('dip').value),
        tpPct: Number(document.getElementById('tp').value),
        budgetUSDT: Number(document.getElementById('budget').value),
        enabled: true,
        createdAt: Date.now()
      };
      const stopLoss = Number(document.getElementById('stopLoss').value);
      const trailing = Number(document.getElementById('trailingStop').value);
      const partials = parsePartialTargets(document.getElementById('partials').value);
      if (stopLoss > 0) {
        rule.stopLossPct = stopLoss;
      }
      if (trailing > 0) {
        rule.trailingStopPct = trailing;
      }
      if (partials.length) {
        rule.takeProfitSteps = partials;
      }
      const indicatorSettings = readIndicatorSettingsFromForm();
      if (indicatorSettings) {
        rule.indicatorSettings = indicatorSettings;
      }
      const next = [...state.rules, rule];
      try {
        await persistAll(next, { text: translate('status.manualAdded'), type: 'success' });
        manualForm.reset();
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }

    async function syncRules() {
      try {
        const response = await api('/api/rules/sync', { method: 'POST' });
        state.rules = extractRules(response);
        updateEntitlementsFromResponse(response);
        renderTables();
        setStatus(translate('status.manualSynced'), 'info');
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }

    async function toggleRule(id, enabled) {
      const rule = state.rules.find(r => r.id === id);
      if (!rule) return;
      if (enabled) {
        const ent = state.entitlements || {};
        const type = (rule.type || '').toLowerCase();
        if (!ent || !ent.plan) {
          const messageKey = type === 'manual' ? 'status.manualLocked' : 'status.aiLocked';
          setStatus(translate(messageKey), 'error');
          renderTables();
          return;
        }
        if (type === 'manual') {
          if (ent.manualEnabled === false) {
            setStatus(translate('status.manualLocked'), 'error');
            renderTables();
            return;
          }
          const manualLimit = Number(ent?.manualLimit);
          if (Number.isFinite(manualLimit) && manualLimit > 0) {
            const activeManual = state.rules.filter(r => (r.type || '').toLowerCase() === 'manual' && r.enabled).length;
            const nextActive = rule.enabled ? activeManual : activeManual + 1;
            if (nextActive > manualLimit) {
              setStatus(translate('status.manualLimit', { count: manualLimit }), 'error');
              renderTables();
              return;
            }
          }
        } else if (type === 'ai') {
          if (ent.aiEnabled === false) {
            setStatus(translate('status.aiLocked'), 'error');
            renderTables();
            return;
          }
          const aiLimit = Number(ent?.aiLimit);
          if (Number.isFinite(aiLimit) && aiLimit > 0) {
            const activeAi = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai' && r.enabled).length;
            const nextActive = rule.enabled ? activeAi : activeAi + 1;
            if (nextActive > aiLimit) {
              setStatus(translate('status.aiLimit', { count: aiLimit }), 'error');
              renderTables();
              return;
            }
          }
        }
      }
      const next = state.rules.map(r => r.id === id ? { ...r, enabled } : r);
      try {
        await persistAll(next, { text: translate(enabled ? 'status.ruleActivated' : 'status.rulePaused'), type: 'info' });
      } catch (err) {
        setStatus(err.message, 'error');
        renderTables();
      }
    }

    async function deleteRule(id) {
      if (!id) return;
      if (!confirm(translate('common.confirmDelete'))) return;
      try {
        const data = await api(`/api/rules/${id}`, { method: 'DELETE' });
        state.rules = extractRules(data);
        updateEntitlementsFromResponse(data);
        renderTables();
        setStatus(translate('status.ruleDeleted'), 'info');
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }

    async function generateAiRule(event) {
      event.preventDefault();
      if (aiGenerateBtn.dataset.loading === 'true') return;
      const budget = Number(document.getElementById('aiBudget').value);
      if (!(budget > 0)) {
        setStatus(translate('status.aiBudgetInvalid'), 'error');
        return;
      }
      const ent = state.entitlements || {};
      if (!ent || !ent.plan || ent.aiEnabled === false) {
        setStatus(translate('status.aiLocked'), 'error');
        return;
      }
      const aiLimit = Number(ent?.aiLimit);
      const activeAi = state.rules.filter(r => (r.type || '').toLowerCase() === 'ai' && r.enabled).length;
      if (Number.isFinite(aiLimit) && aiLimit > 0 && activeAi >= aiLimit) {
        setStatus(translate('status.aiLimit', { count: aiLimit }), 'error');
        return;
      }
      aiGenerateBtn.dataset.loading = 'true';
      aiGenerateBtn.disabled = true;
      try {
        const data = await api('/api/ai-role', {
          method: 'POST',
          body: { budgetUSDT: budget, locale: state.language }
        });
        updateEntitlementsFromResponse(data);
        await loadRules();
        if (data && data.rule && data.rule.aiModel) {
          const modelInput = document.getElementById('aiModel');
          if (modelInput) modelInput.value = data.rule.aiModel;
        }
        setStatus(translate('status.aiGenerated'), 'success');
        await loadOrders(true);
      } catch (err) {
        console.error('ai error', err);
        setStatus(err.message, 'error');
      } finally {
        aiGenerateBtn.disabled = false;
        delete aiGenerateBtn.dataset.loading;
      }
    }

    function handleLogout() {
      setToken('');
      state.user = null;
      state.rules = [];
      state.hasKeys = false;
      state.lastRuleErrorsDigest = '';
      state.completedTrades = [];
      state.completedTradesErrors = [];
      state.isCompletedTradesLoading = false;
      state.performanceMetrics = null;
      state.security = defaultSecurityState();
      state.loginMfaRequired = false;
      if (state.ordersTimer) clearInterval(state.ordersTimer);
      updateEntitlements(null);
      renderTables();
      renderOrders([]);
      renderCompletedTrades([]);
      renderPerformanceMetrics(null);
      renderSecuritySettings();
      renderLoginMfa();
      if (loginMfaInput) loginMfaInput.value = '';
      if (mfaTokenInput) mfaTokenInput.value = '';
      showLanding();
    }

    function initAuthTabs() {
      authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          authTabs.forEach(btn => btn.classList.toggle('is-active', btn === tab));
          const target = tab.getAttribute('data-auth-tab');
          document.querySelectorAll('[data-auth-panel]').forEach(panel => {
            panel.classList.toggle('hidden', panel.getAttribute('data-auth-panel') !== target);
          });
        });
      });
    }

    document.body.addEventListener('change', event => {
      const target = event.target;
      if (target && target.dataset && target.dataset.action === 'toggle') {
        toggleRule(target.dataset.id, target.checked);
      }
    });

    document.body.addEventListener('click', event => {
      const checkoutBtn = event.target.closest('[data-action="checkout"]');
      if (checkoutBtn) {
        event.preventDefault();
        startCheckout(checkoutBtn.dataset.planId, checkoutBtn.dataset.provider, checkoutBtn);
        return;
      }
      const deleteBtn = event.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        deleteRule(deleteBtn.dataset.id);
      }
    });

    document.querySelectorAll('[data-scroll-to-auth]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        window.scrollTo({ top: authSection.offsetTop - 40, behavior: 'smooth' });
      });
    });

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    apiKeysForm.addEventListener('submit', submitApiKeys);
    removeKeysBtn.addEventListener('click', removeApiKeys);
    manualForm.addEventListener('submit', addManualRule);
    syncRulesBtn.addEventListener('click', syncRules);
    aiForm.addEventListener('submit', generateAiRule);
    if (alertSettingsForm) alertSettingsForm.addEventListener('submit', submitAlertSettings);
    if (setupMfaBtn) setupMfaBtn.addEventListener('click', setupMfa);
    if (enableMfaBtn) enableMfaBtn.addEventListener('click', openEnableMfa);
    if (disableMfaBtn) disableMfaBtn.addEventListener('click', openDisableMfa);
    if (confirmMfaBtn) confirmMfaBtn.addEventListener('click', confirmMfaAction);
    refreshOrdersBtn.addEventListener('click', () => loadOrders());
    refreshCompletedBtn.addEventListener('click', () => loadCompletedTrades());
    if (accountRealBtn) {
      accountRealBtn.addEventListener('click', () => {
        accountRealBtn.classList.add('is-active');
        accountRealBtn.setAttribute('aria-pressed', 'true');
        if (accountDemoBtn) {
          accountDemoBtn.classList.remove('is-active');
          accountDemoBtn.setAttribute('aria-pressed', 'false');
        }
      });
    }
    if (accountDemoBtn) {
      accountDemoBtn.addEventListener('click', () => {
        accountDemoBtn.classList.add('is-active');
        accountDemoBtn.setAttribute('aria-pressed', 'true');
        if (accountRealBtn) {
          accountRealBtn.classList.remove('is-active');
          accountRealBtn.setAttribute('aria-pressed', 'false');
        }
        window.location.href = '/demo.html';
      });
    }
    languageToggle.addEventListener('click', () => {
      setLanguage(state.language === 'ar' ? 'en' : 'ar');
    });

    initAuthTabs();

    async function init() {
      applyTranslations();
      renderTables();
      renderOrders([]);
      renderCompletedTrades([]);
      await loadPlans();
      if (state.token) {
        try {
          await bootstrapDashboard();
        } catch (err) {
          console.error('init error', err);
          setStatus(err.message, 'error');
          handleLogout();
        }
      }
    }

    init();
  })();
