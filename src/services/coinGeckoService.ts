import { get } from "@/utils";

const BASE_URI = "https://api.coingecko.com/api/";

class CoinGeckoService {
  async getErgPrice(): Promise<number> {
    const data = await get(new URL("v3/simple/price", BASE_URI), {
      ids: "ergo",
      // eslint-disable-next-line @typescript-eslint/naming-convention
      vs_currencies: "usd"
    });

    return data.ergo.usd;
  }
}

export const coinGeckoService = new CoinGeckoService();
