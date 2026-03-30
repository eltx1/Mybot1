import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";

const NOWPAYMENTS_BASE_URL = "https://api.nowpayments.io/v1";

// خدمة التعامل المباشر مع API الخاص بـ NOWPayments.
export function createNowPaymentsService({ apiKey, ipnSecret, timeoutMs = 15000, maxRetries = 2, logger = console }) {
  const client = axios.create({
    baseURL: NOWPAYMENTS_BASE_URL,
    timeout: timeoutMs,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    }
  });

  async function requestWithRetry(config) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await client.request(config);
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const retriable = !status || status >= 500 || status === 429;
        if (!retriable || attempt === maxRetries) break;
        const delayMs = 300 * (attempt + 1);
        logger.warn?.("[NOWPayments] retrying request", { attempt: attempt + 1, delayMs, status });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  async function createPayment(payload) {
    const response = await requestWithRetry({
      method: "POST",
      url: "/payment",
      data: payload
    });
    return response.data;
  }

  function verifyIpnSignature(rawBody, signature) {
    if (!ipnSecret || !signature || !rawBody) return false;
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
    const expected = createHmac("sha512", ipnSecret).update(bodyBuffer).digest("hex");
    const sigBuffer = Buffer.from(String(signature).toLowerCase(), "utf8");
    const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  }

  return {
    createPayment,
    verifyIpnSignature
  };
}
