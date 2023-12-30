import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { VerifiedAsset } from "@/types";

export const VERIFIED_ASSETS: VerifiedAsset[] = [
  {
    tokenId: ERG_TOKEN_ID,
    metadata: { name: "ERG", decimals: ERG_DECIMALS }
  },
  {
    tokenId: "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04",
    metadata: { name: "SigUSD", decimals: 2 }
  },
  {
    tokenId: "003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0",
    metadata: { name: "SigRSV" }
  },
  {
    tokenId: "d71693c49a84fbbecd4908c94813b46514b18b67a99952dc1e6e4791556de413",
    metadata: { name: "ergopad", decimals: 2 }
  },
  {
    tokenId: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
    metadata: { name: "Paideia", decimals: 4 }
  },
  {
    tokenId: "9a06d9e545a41fd51eeffc5e20d818073bf820c635e2a9d922269913e0de369d",
    metadata: { name: "SPF", decimals: 6 }
  },
  {
    tokenId: "cbd75cfe1a4f37f9a22eaee516300e36ea82017073036f07a09c1d2e10277cda",
    metadata: { name: "hodlERG3", decimals: 9 }
  },
  {
    tokenId: "7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9",
    metadata: { name: "GORT", decimals: 0 }
  },
  {
    tokenId: "8b08cdd5449a9592a9e79711d7d79249d7a03c535d17efaee83e216e80a44c4b",
    metadata: { name: "RSN", decimals: 3 }
  },
  {
    tokenId: "e023c5f382b6e96fbd878f6811aac73345489032157ad5affb84aefd4956c297",
    metadata: { name: "rsADA", decimals: 6 }
  }
];
