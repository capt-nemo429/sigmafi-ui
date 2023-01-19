import { ERG_TOKEN_ID } from "@/constants";
import { ASSET_ICONS } from "@/maps/assetIcons";
import { StateTokenMetadata } from "@/stories";
import {
  blockToTime,
  decimalizeBigNumber,
  formatBigNumber,
  getNetworkType
} from "@/utils/otherUtils";
import { Box, decimalize, isDefined } from "@fleet-sdk/common";
import { ErgoAddress, SAFE_MIN_BOX_VALUE, SParse } from "@fleet-sdk/core";
import BigNumber from "bignumber.js";

export function parseOpenOrderBox(
  box: Box<string>,
  metadata: StateTokenMetadata,
  ownAddresses: string[]
) {
  const collateral = box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: BigNumber(token.amount),
    metadata: metadata[token.tokenId]
  }));

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: BigNumber(box.value),
      metadata: metadata[ERG_TOKEN_ID]
    });
  }

  const interestValue = new BigNumber(parseOr(box.additionalRegisters.R6, "0")).minus(
    parseOr(box.additionalRegisters.R5, "0")
  );

  const interest = interestValue
    .dividedBy(parseOr(box.additionalRegisters.R5, "0"))
    .multipliedBy(100)
    .decimalPlaces(3);

  const apr = interest
    .dividedBy((parseOr(box.additionalRegisters.R7, 0) * 2) / 60 / 24)
    .multipliedBy(365)
    .decimalPlaces(3);

  const borrower = isDefined(box.additionalRegisters.R4)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R4.substring(4)).encode(getNetworkType())
    : undefined;

  return {
    loan: {
      tokenId: ERG_TOKEN_ID,
      amount: BigNumber(parseOr(box.additionalRegisters.R5, "0")),
      metadata: metadata[ERG_TOKEN_ID]
    },
    term: blockToTime(parseOr(box.additionalRegisters.R7, 0)),
    collateral,
    interest: {
      metadata: metadata[ERG_TOKEN_ID],
      tokenId: ERG_TOKEN_ID,
      amount: interestValue,
      percent: interest,
      apr: apr
    },
    borrower,
    cancellable: borrower ? ownAddresses.includes(borrower) : false
  };
}

export function parseBondBox(
  box: Box<string>,
  metadata: StateTokenMetadata,
  currentHeight: number,
  ownAddresses: string[]
) {
  const collateral = box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: BigNumber(token.amount),
    metadata: metadata[token.tokenId]
  }));

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: BigNumber(box.value),
      metadata: metadata[ERG_TOKEN_ID]
    });
  }

  const borrower = isDefined(box.additionalRegisters.R5)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R5.substring(4)).encode(getNetworkType())
    : undefined;

  const lender = isDefined(box.additionalRegisters.R8)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R8.substring(4)).encode(getNetworkType())
    : undefined;

  const blocksLeft = parseOr<number>(box.additionalRegisters.R7, 0) - currentHeight;

  return {
    repayment: {
      tokenId: ERG_TOKEN_ID,
      amount: BigNumber(parseOr(box.additionalRegisters.R6, "0")),
      metadata: metadata[ERG_TOKEN_ID]
    },
    term: blockToTime(blocksLeft),
    collateral,
    borrower,
    lender,
    type: isDefined(lender) && ownAddresses.includes(lender) ? "lend" : "debit",
    liquidable: blocksLeft <= 0 && isDefined(lender) && ownAddresses.includes(lender),
    repayable: blocksLeft > 0 && isDefined(borrower) && ownAddresses.includes(borrower)
  };
}

function decimalizeDefault(val: string, decimals: number) {
  return decimalize(val, { decimals, thousandMark: "," });
}

export function decimalizeAndFormat(val: string, decimals: number): string {
  return formatBigNumber(decimalizeBigNumber(new BigNumber(val), decimals), decimals);
}

function parseOr<T>(value: string | undefined, or: T) {
  return value ? SParse<T>(value) : or;
}

export function verifiedToken(tokenId: string) {
  return isDefined(ASSET_ICONS[tokenId]);
}