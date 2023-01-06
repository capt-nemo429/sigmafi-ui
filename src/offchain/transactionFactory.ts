import { MIN_FEE } from "@/constants";
import { useWalletStore } from "@/stories";
import { EIP12UnsignedTransaction } from "@fleet-sdk/common";
import { Amount, Box, ErgoAddress, TransactionBuilder } from "@fleet-sdk/core";
import { EIP12ErgoAPI } from "@nautilus-js/eip12-types";
import {
  CancelOrderPlugin,
  CloseOrderPlugin,
  LiquidatePlugin,
  OpenOrderParams,
  OpenOrderPlugin
} from "./plugins";

export class TransactionFactory {
  public static async openOrder(order: Omit<OpenOrderParams, "borrower">) {
    const wallet = useWalletStore();
    const context = wallet.getContext();

    const height = await context.get_current_height();
    const inputs = await context.get_utxos();
    const changeAddress = ErgoAddress.fromBase58(await context.get_change_address());

    const unsignedTx = new TransactionBuilder(height)
      .from(inputs)
      .extend(OpenOrderPlugin({ ...order, borrower: changeAddress }))
      .payFee(MIN_FEE)
      .sendChangeTo(changeAddress)
      .build("EIP-12");

    return await this._signAndSend(unsignedTx, context);
  }

  public static async cancelOrder(box: Box<Amount>) {
    const wallet = useWalletStore();
    const context = wallet.getContext();

    const height = await context.get_current_height();
    const inputs = await context.get_utxos();
    const changeAddress = ErgoAddress.fromBase58(await context.get_change_address());

    const unsignedTx = new TransactionBuilder(height)
      .from(inputs)
      .extend(CancelOrderPlugin(box, changeAddress))
      .payFee(MIN_FEE)
      .sendChangeTo(changeAddress)
      .build("EIP-12");

    return await this._signAndSend(unsignedTx, context);
  }

  public static async closeOrder(orderBox: Box<Amount>) {
    const wallet = useWalletStore();
    const context = wallet.getContext();

    const height = await context.get_current_height();
    const inputs = await context.get_utxos();
    const changeAddress = ErgoAddress.fromBase58(await context.get_change_address());
    const implementor = ErgoAddress.fromBase58(
      "9i3g6d958MpZAqWn9hrTHcqbBiY5VPYBBY6vRDszZn4koqnahin"
    );

    const unsignedTx = new TransactionBuilder(height)
      .from(inputs)
      .extend(
        CloseOrderPlugin(orderBox, {
          currentHeight: height,
          lender: changeAddress,
          uiImplementor: implementor
        })
      )
      .payFee(MIN_FEE)
      .sendChangeTo(changeAddress)
      .build("EIP-12");

    return await this._signAndSend(unsignedTx, context);
  }

  public static async liquidate(box: Box<Amount>) {
    const wallet = useWalletStore();
    const context = wallet.getContext();

    const height = await context.get_current_height();
    const inputs = await context.get_utxos();
    const changeAddress = ErgoAddress.fromBase58(await context.get_change_address());

    const unsignedTx = new TransactionBuilder(height)
      .from(inputs)
      .extend(LiquidatePlugin(box, changeAddress))
      .payFee(MIN_FEE)
      .sendChangeTo(changeAddress)
      .build("EIP-12");

    return await this._signAndSend(unsignedTx, context);
  }

  private static async _signAndSend(unsignedTx: EIP12UnsignedTransaction, context: EIP12ErgoAPI) {
    const signedTx = await context.sign_tx(unsignedTx);
    return await context.submit_tx(signedTx);
  }
}
