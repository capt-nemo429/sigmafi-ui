import { isDefined } from "@fleet-sdk/common";

export async function get<T = any>(url: URL, params?: any): Promise<T> {
  if (isDefined(params)) {
    Object.keys(params).map((key) => url.searchParams.append(key, params[key]));
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  return await response.json();
}
