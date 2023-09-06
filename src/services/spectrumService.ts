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

export type SpectrumPoolStat = {
  id: string;
  lockedX: SpectrumLockedValue;
  lockedY: SpectrumLockedValue;
  tvl: { value: number };
};

export type SpectrumLockedValue = {
  id: string;
  amount: number;
  ticker: string;
  decimals: number;
};

export type AssetPriceRate = {
  [tokenId: string]: { erg: number; fiat: number };
};

// https://api.spectrum.fi/v1/docs
const BASE_URL = "https://api.spectrum.fi";
const SPECTRUM_ERG_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";
const MIN_USD_LIQUIDITY = 10_000;

class SpectrumService {
  #highLiquidityTokenIds?: string[];

  public async getPoolsStats(): Promise<SpectrumPoolStat[]> {
    return get<SpectrumPoolStat[]>(new URL("v1/amm/pools/stats", BASE_URL));
  }

  public async getHighLiquidityTokenIds(): Promise<string[]> {
    if (!this.#highLiquidityTokenIds) {
      const stats = await this.getPoolsStats();
      this.#highLiquidityTokenIds = stats
        .filter((x) => x.lockedX.id === SPECTRUM_ERG_TOKEN_ID && x.tvl.value >= MIN_USD_LIQUIDITY)
        .map((x) => x.lockedY.id);
    }

    return this.#highLiquidityTokenIds;
  }

  public async getTokenRates(): Promise<AssetPriceRate> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const [ergPrice, markets, hiLiqTokens] = await Promise.all([
      coinGeckoService.getErgPrice(),
      get<SpectrumPool[]>(new URL("v1/price-tracking/markets", BASE_URL), {
        from: this._getUtcTimestamp(fromDate),
        to: this._getUtcTimestamp(new Date())
      }),
      this.getHighLiquidityTokenIds()
    ]);

    const pools = uniqWith(
      markets.filter((p) => p.baseId === SPECTRUM_ERG_TOKEN_ID && hiLiqTokens.includes(p.quoteId)),
      (a, b) => a.quoteId === b.quoteId && a.baseVolume.value <= b.baseVolume.value
    );

    const dict = toDict(pools, (r) => {
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
