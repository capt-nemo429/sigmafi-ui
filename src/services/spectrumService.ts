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

const HI_LIQ_ASSETS = [
  "18c938e1924fc3eadc266e75ec02d81fe73b56e4e9f4e268dffffcb30387c42d",
  "0cd8c9f416e5b1ca9f986a7f10a84191dfb85941619e49e53c0dc30ebf83324b",
  "00b1e236b60b95c2c6f8007a9d89bc460fc9e78f98b09faec9449007b40bccf3",
  "00bd762484086cf560d3127eb53f0769d76244d9737636b2699d55c56cd470bf",
  "007fd64d1ee54d78dd269c8930a38286caa28d3f29d27cadcb796418ab15c283",
  "e8b20745ee9d18817305f32eb21015831a48f02d40980de6e849f886dca7f807",
  "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
  "089990451bb430f05a85f4ef3bcb6ebf852b3d6ee68d86d78658b9ccef20074f",
  "003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0",
  "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04",
  "02f31739e2e4937bb9afb552943753d1e3e9cdd1a5e5661949cb0cef93f907ea",
  "d71693c49a84fbbecd4908c94813b46514b18b67a99952dc1e6e4791556de413",
  "9a06d9e545a41fd51eeffc5e20d818073bf820c635e2a9d922269913e0de369d",
  "472c3d4ecaa08fb7392ff041ee2e6af75f4a558810a74b28600549d5392810e8"
];

// https://api.spectrum.fi/v1/docs
const BASE_URL = "https://api.spectrum.fi";
const SPECTRUM_ERG_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";

class SpectrumService {
  public async getTokenRates(): Promise<AssetPriceRate> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const [ergPrice, data] = await Promise.all([
      coinGeckoService.getErgPrice(),
      get<SpectrumPool[]>(new URL("v1/amm/markets", BASE_URL), {
        from: this._getUtcTimestamp(fromDate),
        to: this._getUtcTimestamp(new Date())
      })
    ]);

    const filtered = uniqWith(
      data.filter((x) => x.baseId === SPECTRUM_ERG_TOKEN_ID && HI_LIQ_ASSETS.includes(x.quoteId)),
      (a, b) => a.quoteId === b.quoteId && BigNumber(a.baseVolume.value).lt(b.baseVolume.value)
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
