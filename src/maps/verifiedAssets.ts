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
  }
];
