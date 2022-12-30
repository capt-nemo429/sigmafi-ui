import { Box, ensureBigInt, first, some } from "@fleet-sdk/common";
import {
  Amount,
  ErgoAddress,
  FleetPlugin,
  OutputBuilder,
  SAFE_MIN_BOX_VALUE,
  SConstant,
  SGroupElement,
  SInt,
  SLong,
  SSigmaProp,
  TokenAmount
} from "@fleet-sdk/core";

export type OpenOrderParams = {
  type: "on-close" | "fixed-height";
  borrower: ErgoAddress;
  lendAmount: Amount;
  repaymentAmount: Amount;
  maturityLength: number;
  collateral: {
    nanoErgs?: Amount;
    tokens?: TokenAmount<Amount>[];
  } & ({ nanoErgs: Amount } | { tokens: TokenAmount<Amount>[] });
};

export const ERG_ON_CLOSE_OPEN_ORDER_CONTRACT =
  "1012040005e80705c09a0c08cd03a11d3028b9bc57b6ac724485e99960b89c278db6bab5d2b961b01aee29405a0205a0060601000e20803b0d443d2899bb5cbf2bdc496d5601677af2b1969f6e90775214c944b8680e04020400043c04100400040401010402040601010101d80bd601b2a5730000d602e4c6a70408d603e4c6a70704d604e4c6a70505d605e30008d606e67205d6077301d6087302d6097303d60a957206d801d60a7e72040683024406860272099d9c7e720706720a7e7208068602e472059d9c7e730406720a7e72080683014406860272099d9c7e7207067e7204067e720806d60b730595937306cbc27201d804d60c999aa37203e4c672010704d60db2a5730700d60eb2720a730800d60f8c720e02d1ed96830b0193e4c67201040ec5a793e4c672010508720293e4c672010605e4c6a70605e6c67201080893db63087201db6308a793c17201c1a7927203730990720c730a92720c730b93c2720dd0720293c1720d7204ed9591720f720bd801d610b2a5730c009683020193c27210d08c720e01937ec1721006720f730d957206d802d610b2720a730e00d6118c72100295917211720bd801d612b2a5730f009683020193c27212d08c721001937ec17212067211731073117202";

export function OpenOrderPlugin(order: OpenOrderParams): FleetPlugin {
  // todo: add collateral inclusion guard
  // todo: add maturity check based on contract type

  return ({ addOutputs }) => {
    let amount = ensureBigInt(order.collateral.nanoErgs || 0n);
    if (amount <= 0n) {
      amount = SAFE_MIN_BOX_VALUE;
    }

    const orderOutput = new OutputBuilder(amount, ERG_ON_CLOSE_OPEN_ORDER_CONTRACT);
    if (some(order.collateral.tokens)) {
      orderOutput.addTokens(order.collateral.tokens);
    }

    orderOutput.setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(first(order.borrower.getPublicKeys())))),
      R5: SConstant(SLong(order.lendAmount)),
      R6: SConstant(SLong(order.repaymentAmount)),
      R7: SConstant(SInt(order.maturityLength))
    });

    addOutputs(orderOutput);
  };
}

export function CancelOrderPlugin(orderBox: Box<Amount>, destination: ErgoAddress): FleetPlugin {
  // todo: add validation if orderBox is valid
  // todo: add validation if orderBox is spendably by destination pk

  return ({ addInputs, addOutputs }) => {
    addInputs(orderBox);
    addOutputs(new OutputBuilder(orderBox.value, destination).addTokens(orderBox.assets));
  };
}
