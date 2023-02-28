import BigNumber from "bignumber.js";
import { uniqWith } from "lodash-es";
import { coinGeckoService } from "./coinGeckoService";
import { ERG_TOKEN_ID } from "@/constants";
import { get, toDict } from "@/utils";

export type SpectrumPool = {
  id: string;
  baseId: string;
  baseSymbol: string;
  quoteId: string;
  quoteSymbol: string;
  lastPrice: number;
  baseVolume: SpectrumPoolVolume;
  quoteVolume: SpectrumPoolVolume;
};

export type SpectrumPoolVolume = {
  value: number;
};

export type AssetPriceRate = {
  [tokenId: string]: { erg: number; fiat: number };
};

const BASE_URL = "https://api.spectrum.fi";
const SPECTRUM_ERG_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";

class SpectrumService {
  public async getTokenRates(): Promise<AssetPriceRate> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const [ergPrice, data] = await Promise.all([
      coinGeckoService.getErgPrice(),
      get<SpectrumPool[]>(new URL("v1/amm/pools/summary", BASE_URL), {
        from: this._getUtcTimestamp(fromDate),
        to: this._getUtcTimestamp(new Date())
      })
    ]);

    const filtered = uniqWith(
      data.filter((x) => x.baseId === SPECTRUM_ERG_TOKEN_ID),
      (a, b) =>
        a.quoteId === b.quoteId && BigNumber(a.baseVolume.value).isLessThan(b.baseVolume.value)
    );

    const dict = toDict(filtered, (r) => {
      const erg = BigNumber(1).div(r.lastPrice);

      return {
        [r.quoteId]: {
          erg: erg.toNumber(),
          fiat: erg.times(ergPrice).toNumber()
        }
      };
    });

    dict[ERG_TOKEN_ID] = { erg: 1, fiat: ergPrice };

    return dict;
  }

  private _getUtcTimestamp(date: Date) {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
  }
}

export const spectrumService = new SpectrumService();
