import { BigNumber } from "bignumber.js";

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
