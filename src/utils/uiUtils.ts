import { isDefined } from "@fleet-sdk/common";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { Ref } from "vue";
import TxIdNotification from "@/components/TxIdNotification.vue";

export function showToast(
  msg: string,
  type: "alert-success" | "alert-error" | "alert-info" = "alert-info"
) {
  const { oruga } = useProgrammatic();
  oruga.notification.open({
    duration: 5000,
    message: msg,
    rootClass: "toast toast-top toast-center min-w-max bg-transparent",
    contentClass: "alert " + type
  });
}

export async function sendTransaction(
  callback: () => Promise<string>,
  loadingRef: Ref
): Promise<boolean> {
  loadingRef.value = true;

  try {
    const txId = await callback();

    const { oruga } = useProgrammatic();
    oruga.notification.open({
      duration: 5000,
      component: TxIdNotification,
      props: { txId }
    });

    loadingRef.value = false;

    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    loadingRef.value = false;
    // eslint-disable-next-line no-console
    console.error(e);

    let message = "Unknown error.";
    if (isDefined(e.message)) {
      message = e.message;
    } else if (isDefined(e.info)) {
      if (e.code === 2) {
        loadingRef.value = false;

        return false;
      }

      message = "dApp Connector: " + e.info;
    } else if (typeof e === "string") {
      message = e;
    }

    showToast(message, "alert-error");
  }

  return false;
}

export function setSystemTheme() {
  const isInDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isInDarkMode) {
    setTheme("dark");
  } else {
    setTheme("light");
  }
}

export function toggleTheme() {
  setTheme(getCurrentTheme());
}

export function getCurrentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme: "light" | "dark") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  document.documentElement.setAttribute("data-theme", theme);
}
