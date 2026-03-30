// منطق مشترك للدفع والاشتراكات بعيدًا عن تفاصيل مزود الدفع.
export function createPaymentService({ appBaseUrl, logger = console }) {
  const successfulStatuses = new Set(["confirmed", "finished"]);
  const failedStatuses = new Set(["failed", "expired", "refunded", "partially_refunded"]);

  function buildSubscriptionMetadata({ userId, planId, reference }) {
    return {
      userId: Number(userId),
      planId: Number(planId),
      reference,
      type: "subscription"
    };
  }

  function createReturnUrls(reference) {
    const encoded = encodeURIComponent(reference);
    return {
      successUrl: `${appBaseUrl}/billing/success?ref=${encoded}`,
      cancelUrl: `${appBaseUrl}/billing/cancel?ref=${encoded}`
    };
  }

  function getWebhookStatusAction(status) {
    const normalized = String(status || "").toLowerCase();
    if (successfulStatuses.has(normalized)) return "activate";
    if (failedStatuses.has(normalized)) return "fail";
    return "ignore";
  }

  function extractReferenceFromWebhook(payload) {
    return payload?.order_id
      || payload?.metadata?.reference
      || payload?.purchase_id
      || payload?.payment_id
      || null;
  }

  function extractMetadata(payload) {
    const metadata = payload?.metadata;
    if (!metadata || typeof metadata !== "object") return {};
    return metadata;
  }

  function mapCurrency(value, fallback = "USD") {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized || fallback;
  }

  function mapPriceAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return amount;
  }

  function logPaymentError(message, context = {}) {
    logger.error?.(`[PAYMENTS] ${message}`, context);
  }

  return {
    buildSubscriptionMetadata,
    createReturnUrls,
    getWebhookStatusAction,
    extractReferenceFromWebhook,
    extractMetadata,
    mapCurrency,
    mapPriceAmount,
    logPaymentError
  };
}
