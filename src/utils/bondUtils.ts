import { Box, isDefined } from "@fleet-sdk/common";
import { ErgoAddress, SAFE_MIN_BOX_VALUE, SParse } from "@fleet-sdk/core";
import BigNumber from "bignumber.js";
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { ASSET_ICONS } from "@/maps/assetIcons";
import {
  extractTokenIdFromBondContract,
  extractTokenIdFromOrderContract
} from "@/offchain/plugins";
import { AssetPriceRate } from "@/services/spectrumService";
import { StateTokenMetadata } from "@/stories";
import { AssetMetadata } from "@/types";
import { blockToTime, decimalizeBigNumber, getNetworkType, LoanTerm } from "@/utils/otherUtils";

type LoanAsset = {
  tokenId: string;
  amount: BigNumber;
  metadata?: AssetMetadata;
};

export type Loan = {
  box: Readonly<Box<string>>;
  principal: LoanAsset;
  collateral: LoanAsset[];
  interest?: LoanAsset & {
    percent: BigNumber;
    apr: BigNumber;
  };
  ratio?: BigNumber;
  term: LoanTerm;
  borrower: string;
};

export type Order = Loan & {
  cancellable: boolean;
};

export type Bond = Loan & {
  lender: string;
  type: "lend" | "debit";
  liquidable: boolean;
  repayable: boolean;
};

export function parseOpenOrderBox(
  box: Box<string>,
  metadata: StateTokenMetadata,
  priceRates: AssetPriceRate,
  ownAddresses: string[]
): Order {
  const collateral = box.assets.map(
    (token) =>
      ({
        tokenId: token.tokenId,
        amount: decimalizeBigNumber(BigNumber(token.amount), metadata[token.tokenId]?.decimals),
        metadata: metadata[token.tokenId]
      } as LoanAsset)
  );

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: decimalizeBigNumber(BigNumber(box.value), ERG_DECIMALS),
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
    : "";

  const tokenId = extractTokenIdFromOrderContract(box.ergoTree);

  const order: Order = {
    principal: {
      tokenId: tokenId,
      amount: decimalizeBigNumber(
        BigNumber(parseOr(box.additionalRegisters.R5, "0")),
        metadata[tokenId].decimals
      ),
      metadata: metadata[tokenId]
    },
    term: blockToTime(parseOr(box.additionalRegisters.R7, 0)),
    collateral,
    interest: {
      amount: decimalizeBigNumber(interestValue, metadata[tokenId]?.decimals),
      metadata: metadata[tokenId],
      tokenId: tokenId,
      percent: interest,
      apr: apr
    },
    borrower,
    cancellable: borrower ? ownAddresses.includes(borrower) : false,
    box: Object.freeze(box)
  };
  order.ratio = calculateRatio(order, priceRates);

  return order;
}

export function parseBondBox(
  box: Box<string>,
  metadata: StateTokenMetadata,
  priceRates: AssetPriceRate,
  currentHeight: number,
  ownAddresses: string[]
): Bond {
  const collateral = box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: decimalizeBigNumber(BigNumber(token.amount), metadata[token.tokenId]?.decimals),
    metadata: metadata[token.tokenId]
  }));

  if (BigInt(box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: decimalizeBigNumber(BigNumber(box.value), ERG_DECIMALS),
      metadata: metadata[ERG_TOKEN_ID]
    });
  }

  const borrower = isDefined(box.additionalRegisters.R5)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R5.substring(4)).encode(getNetworkType())
    : "";

  const lender = isDefined(box.additionalRegisters.R8)
    ? ErgoAddress.fromPublicKey(box.additionalRegisters.R8.substring(4)).encode(getNetworkType())
    : "";

  const blocksLeft = parseOr<number>(box.additionalRegisters.R7, 0) - currentHeight;
  const tokenId = extractTokenIdFromBondContract(box.ergoTree);

  const bond: Bond = {
    principal: {
      tokenId: tokenId,
      amount: decimalizeBigNumber(
        BigNumber(parseOr(box.additionalRegisters.R6, "0")),
        metadata[tokenId].decimals
      ),
      metadata: metadata[tokenId]
    },
    term: blockToTime(blocksLeft),
    collateral,
    borrower,
    lender,
    type: isDefined(lender) && ownAddresses.includes(lender) ? "lend" : "debit",
    liquidable: blocksLeft <= 0 && isDefined(lender) && ownAddresses.includes(lender),
    repayable: blocksLeft > 0 && isDefined(borrower) && ownAddresses.includes(borrower),
    box: Object.freeze(box)
  };
  bond.ratio = calculateRatio(bond, priceRates);

  return bond;
}

function calculateRatio(loan: Loan, rates: AssetPriceRate) {
  if (!rates[loan.principal.tokenId]) {
    return;
  }

  const principal = loan.principal.amount.times(rates[loan.principal.tokenId]?.fiat || 0);
  const interest = loan.interest
    ? loan.interest.amount.times(rates[loan.interest.tokenId]?.fiat || 0)
    : 0;
  const collateral = loan.collateral.reduce((acc, val) => {
    const price = val.metadata ? val.amount.times(rates[val.tokenId]?.fiat || 0) : 0;

    return acc.plus(price);
  }, BigNumber(0));

  return collateral.minus(interest).div(principal).times(100);
}

function parseOr<T>(value: string | undefined, or: T) {
  return value ? SParse<T>(value) : or;
}

export function verifiedToken(tokenId: string) {
  return isDefined(ASSET_ICONS[tokenId]);
}
