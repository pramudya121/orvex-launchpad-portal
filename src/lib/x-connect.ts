// Client-safe helper for the X App User Connector popup flow.
// No secrets here — the server functions do the credential work.
import { completeXConnection, startXConnect } from "./faucet.functions";

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "x" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("X connection failed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("X window closed before completion."));
    }, 500);
  });
}

/** Opens the X consent popup and stores the resulting connection server-side. */
export async function connectX(wallet: string) {
  const popup = window.open("", "lovable-oauth", "width=600,height=720");
  if (!popup) throw new Error("Popup blocked. Allow popups and try again.");
  let code: string | null;
  try {
    const { authorizationUrl } = await startXConnect({ data: { wallet } });
    const completion = waitForOAuthCompletion(popup);
    popup.location.href = authorizationUrl;
    code = await completion;
  } catch (error) {
    popup.close();
    throw error;
  }
  if (code) await completeXConnection({ data: { wallet, code } });
}
