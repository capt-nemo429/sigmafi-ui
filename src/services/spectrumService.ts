import { get } from "@/utils";
import BigNumber from "bignumber.js";
import { uniqWith } from "lodash-es";

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
  [tokenId: string]: { erg: number };
};

const BASE_URL = "https://api.spectrum.fi";
const SPECTRUM_ERG_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";

class ErgoDexService {
  public async getTokenRates(): Promise<AssetPriceRate> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const data = await get<SpectrumPool[]>(new URL("v1/amm/markets", BASE_URL), {
      from: this._getUtcTimestamp(fromDate),
      to: this._getUtcTimestamp(new Date())
    });

    const filtered = uniqWith(
      data.filter((x) => x.baseId === SPECTRUM_ERG_TOKEN_ID),
      (a, b) =>
        a.quoteId === b.quoteId && BigNumber(a.baseVolume.value).isLessThan(b.baseVolume.value)
    );

    const dict: AssetPriceRate = {};
    filtered.map((r) => {
      dict[r.quoteId] = { erg: BigNumber(1).dividedBy(r.lastPrice).toNumber() };
    });

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

export const spectrumService = new ErgoDexService();
