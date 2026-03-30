// Controller خاص بـ Webhook لـ NOWPayments.
export function createNowPaymentsWebhookController({
  nowPaymentsService,
  paymentService,
  activateSubscription,
  markSubscriptionStatus,
  logPaymentEvent
}) {
  return async function nowPaymentsWebhook(req, res) {
    const payload = req.body || {};
    const signature = req.headers?.["x-nowpayments-sig"];

    if (!nowPaymentsService.verifyIpnSignature(req.rawBody, signature)) {
      await logPaymentEvent({
        provider: "nowpayments",
        eventType: "webhook.signature_invalid",
        status: "rejected",
        payload,
        headers: req.headers,
        errorMessage: "Invalid NOWPayments signature"
      });
      return res.status(400).json({ error: "Invalid signature" });
    }

    const reference = paymentService.extractReferenceFromWebhook(payload);
    const metadata = paymentService.extractMetadata(payload);
    const status = String(payload?.payment_status || payload?.status || "").toLowerCase();

    await logPaymentEvent({
      provider: "nowpayments",
      eventType: "webhook.received",
      reference,
      status,
      payload,
      headers: req.headers,
      transactionId: payload?.payment_id || null,
      invoiceId: payload?.invoice_id || null
    });

    if (!reference) {
      return res.json({ ok: true, ignored: true });
    }

    try {
      const action = paymentService.getWebhookStatusAction(status);
      if (action === "activate") {
        await activateSubscription(reference, {
          status: "active",
          providerInvoiceId: payload?.invoice_id || null,
          amountUSD: paymentService.mapPriceAmount(payload?.price_amount),
          currency: paymentService.mapCurrency(payload?.pay_currency || payload?.price_currency || "USD"),
          paymentStatus: status,
          paymentCryptoCurrency: paymentService.mapCurrency(payload?.pay_currency || payload?.outcome_currency || null, "USDT"),
          metadata: {
            ...metadata,
            nowpayments: payload
          }
        });
      } else if (action === "fail") {
        await markSubscriptionStatus(reference, "failed", {
          paymentStatus: status,
          metadata: {
            ...metadata,
            nowpayments: payload
          }
        });
      }

      await logPaymentEvent({
        provider: "nowpayments",
        eventType: "webhook.processed",
        reference,
        status,
        payload,
        transactionId: payload?.payment_id || null,
        invoiceId: payload?.invoice_id || null
      });
      return res.json({ ok: true });
    } catch (error) {
      await logPaymentEvent({
        provider: "nowpayments",
        eventType: "webhook.processing_error",
        reference,
        status,
        payload,
        transactionId: payload?.payment_id || null,
        invoiceId: payload?.invoice_id || null,
        errorMessage: error?.message || "Unknown webhook error"
      });
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  };
}
