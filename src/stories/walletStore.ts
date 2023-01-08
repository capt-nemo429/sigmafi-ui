import { AssetInfo } from "@/types";
import { getNetworkType, showToast } from "@/utils";
import { EIP12UnsignedTransaction, isUndefined, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { EIP12ErgoAPI, SignedTransaction } from "@nautilus-js/eip12-types";
import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, onBeforeMount, ref } from "vue";
import { useChainStore } from "./chainStore";

export const useWalletStore = defineStore("wallet", () => {
  const chain = useChainStore();

  // private
  let _context: EIP12ErgoAPI | undefined;

  // private state
  const _balance = ref<AssetInfo[]>([]);
  const _changeAddress = ref<string>();
  const _loading = ref(false);
  const _connected = ref(false);
  const _usedAddresses = ref<string[]>([]);

  // computed
  const balance = computed(() =>
    _balance.value.map((asset) => ({ ...asset, metadata: chain.tokensMetadata[asset.tokenId] }))
  );
  const loading = computed(() => _loading.value);
  const changeAddress = computed(() => _changeAddress.value);
  const usedAddresses = computed(() => _usedAddresses.value);
  const connected = computed(() => _connected.value);

  // hooks
  onBeforeMount(async () => {
    const firstConnected = localStorage.getItem("firstConnected") === "true";
    if (firstConnected) {
      await connect();
    }
  });

  // actions
  async function connect() {
    if (typeof ergoConnector === "undefined" || !ergoConnector.nautilus) {
      showToast("Nautilus wallet is not installed", "alert-error");

      return;
    }

    if (await ergoConnector.nautilus.isConnected()) {
      return;
    }

    _loading.value = true;

    const granted = await ergoConnector.nautilus.connect({
      createErgoObject: false
    });

    if (granted) {
      _context = await ergoConnector.nautilus.getContext();
      const change = ErgoAddress.fromBase58(await _context.get_change_address());
      if (change.network !== getNetworkType()) {
        disconnect();
        showToast("Wrong wallet network.", "alert-error");

        return;
      }

      _connected.value = true;
      localStorage.setItem("firstConnected", "true");
      await _fetchData();
      if (some(balance.value)) {
        chain.loadTokensMetadata(
          balance.value.filter((x) => isUndefined(x.metadata)).map((x) => x.tokenId)
        );
      }
    } else {
      localStorage.setItem("firstConnected", "false");
    }

    _loading.value = false;
  }

  async function disconnect() {
    _loading.value = true;
    if (ergoConnector?.nautilus) {
      await ergoConnector.nautilus.disconnect();
    }

    localStorage.setItem("firstConnected", "false");
    _context = undefined;
    _usedAddresses.value = [];
    _changeAddress.value = undefined;
    _balance.value = [];
    _connected.value = false;

    _loading.value = false;
  }

  async function _fetchData() {
    if (!_context) {
      return;
    }

    _usedAddresses.value = await _context.get_used_addresses();
    _changeAddress.value = await _context.get_change_address();

    _balance.value = (await _context.get_balance("all")).map((b) => ({
      tokenId: b.tokenId,
      amount: BigInt(b.balance),
      metadata: chain.tokensMetadata[b.tokenId]
    }));
  }

  async function getBoxes() {
    if (!_context) {
      throw new Error("Wallet not connected.");
    }

    return await _context.get_utxos();
  }

  async function getChangeAddress() {
    if (!_context) {
      throw new Error("Wallet not connected.");
    }

    const changeAddress = await _context.get_change_address();
    if (_changeAddress.value !== changeAddress) {
      _changeAddress.value = changeAddress;
    }

    return changeAddress;
  }

  async function signTx(unsignedTx: EIP12UnsignedTransaction) {
    if (!_context) {
      throw new Error("Wallet not connected.");
    }

    return await _context.sign_tx(unsignedTx);
  }

  async function submitTx(signedTx: SignedTransaction) {
    if (!_context) {
      throw new Error("Wallet not connected.");
    }

    return await _context.submit_tx(signedTx);
  }

  return {
    connect,
    disconnect,
    getBoxes,
    getChangeAddress,
    signTx,
    submitTx,
    loading,
    balance,
    changeAddress,
    connected,
    usedAddresses
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot));
}
