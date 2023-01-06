import { BigNumber } from "bignumber.js";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { Network } from "@fleet-sdk/common";

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
  if (getCurrentTheme() === theme) {
    return;
  }

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export function shortenString(
  val: string | undefined,
  maxLength: number,
  ellipsisPosition: "middle" | "end" = "middle"
): string {
  if (!val || maxLength >= val.length) {
    return val ?? "";
  }

  const ellipsis = "…";
  if (ellipsisPosition === "middle") {
    const fragmentSize = Math.trunc((maxLength - ellipsis.length) / 2);
    if (fragmentSize * 2 + ellipsis.length >= val.length) {
      return val;
    }
    return `${val.slice(0, fragmentSize).trimEnd()}${ellipsis}${val
      .slice(val.length - fragmentSize)
      .trimStart()}`;
  } else {
    return `${val.slice(0, maxLength - ellipsis.length + 1).trimEnd()}${ellipsis}`;
  }
}

export function formatBigNumber(number: BigNumber, decimals: number) {
  return number.decimalPlaces(decimals).toFormat({
    groupSeparator: ",",
    groupSize: 3,
    decimalSeparator: "."
  });
}

export function undecimalizeBN(number: BigNumber, decimals: number) {
  return number.decimalPlaces(decimals).shiftedBy(decimals);
}

export function decimalizeBN(number: BigNumber, decimals: number) {
  return number.decimalPlaces(decimals).shiftedBy(decimals * -1);
}

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

export function getNetworkType(): Network {
  if (import.meta.env.PROD) {
    return Network.Mainnet;
  }

  return import.meta.env.VITE_NETWORK === "testnet" ? Network.Testnet : Network.Mainnet;
}

export function blockToTime(blocks: number) {
  const term = { interval: "", value: blocks * 2, blocks };
  let negative = false;

  if (term.value < 0) {
    negative = true;
    term.value *= -1;
  }

  if (term.value > 59) {
    term.value = Math.floor(term.value / 60);
    term.interval = pluralize("hour", term.value);

    if (term.value > 23) {
      term.value = Math.floor(term.value / 24);
      term.interval = pluralize("day", term.value);

      if (term.value > 29) {
        term.value = Math.floor(term.value / 30);
        term.interval = pluralize("month", term.value);
      }
    }
  } else {
    term.interval = pluralize("minute", term.value);
  }

  if (negative) {
    term.interval += " ago";
  }

  return term;
}

export function pluralize(word: string, val: number) {
  if (val <= 1) {
    return word;
  }

  return word + "s";
}
