export function getApiErrorMessage(error, fallbackMessage) {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) {
    // Avoid exposing raw backend/route details in the UI.
    if (/\/api\/|route not found|validation failed|cast to objectid/i.test(serverMessage)) {
      return fallbackMessage;
    }
    return serverMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    return "Service is temporarily unavailable. Please try again in a moment.";
  }

  return fallbackMessage;
}
