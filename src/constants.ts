import { Network } from "@fleet-sdk/common";
import { getNetworkType } from "./utils";

export const ERG_TOKEN_ID = "ERG";
export const ERG_DECIMALS = 9;
export const EXPLORER_URL =
  getNetworkType() === Network.Mainnet
    ? "https://explorer.ergoplatform.com/"
    : "https://testnet.ergoplatform.com/";
