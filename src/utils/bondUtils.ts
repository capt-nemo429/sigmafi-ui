import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { StateAssetMetadata } from "@/stories";
import { blockToTime, formatBigNumber, getNetworkType } from "@/utils/otherUtils";
import { Box, decimalize, isDefined } from "@fleet-sdk/common";
import { ErgoAddress, SAFE_MIN_BOX_VALUE, SParse } from "@fleet-sdk/core";
import BigNumber from "bignumber.js";

export function parseOpenOrderBox(
  box: Box<string>,
  metadata: StateAssetMetadata,
  ownAddresses: string[]
) {
  const collateral = box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: token.amount,
    metadata: metadata[token.tokenId]
  }));

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: box.value,
      metadata: { decimals: ERG_DECIMALS, name: "ERG" }
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
    amount: decimalizeDefault(parseOr(box.additionalRegisters.R5, "0"), ERG_DECIMALS),
    term: blockToTime(parseOr(box.additionalRegisters.R7, 0)),
    collateral,
    interest: {
      percent: formatBigNumber(interest, 3),
      value: decimalizeDefault(interestValue.toString(), ERG_DECIMALS),
      apr: formatBigNumber(apr, 3)
    },
    borrower,
    cancellable: borrower ? ownAddresses.includes(borrower) : false
  };
}

export function parseBondBox(
  box: Box<string>,
  metadata: StateAssetMetadata,
  currentHeight: number,
  ownAddresses: string[]
) {
  const collateral = box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: token.amount,
    metadata: metadata[token.tokenId]
  }));

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: box.value,
      metadata: { decimals: ERG_DECIMALS, name: "ERG" }
    });
  }

  const borrower = isDefined(box.additionalRegisters.R5)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R5.substring(4)).encode(getNetworkType())
    : undefined;

  const lender = isDefined(box.additionalRegisters.R8)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R8.substring(4)).encode(getNetworkType())
    : undefined;

  const blocksLeft = parseOr(box.additionalRegisters.R7, 0) - currentHeight;

  return {
    repayment: decimalizeDefault(parseOr(box.additionalRegisters.R6, "0"), ERG_DECIMALS),
    term: blockToTime(blocksLeft),
    collateral,
    borrower,
    lender,
    liquidable: blocksLeft <= 0 && isDefined(lender) && ownAddresses.includes(lender),
    repayable: blocksLeft > 0 && isDefined(borrower) && ownAddresses.includes(borrower)
  };
}

function decimalizeDefault(val: string, decimals: number) {
  return decimalize(val, { decimals, thousandMark: "," });
}

function parseOr<T>(value: string | undefined, or: T) {
  return value ? SParse<T>(value) : or;
}
