import { ERG_TOKEN_ID } from "@/constants";
import { AssetInfo } from "@/types";
import { getNetworkType, showToast } from "@/utils";
import {
  Amount,
  Box,
  EIP12UnsignedTransaction,
  ensureBigInt,
  isUndefined,
  some,
  utxoSum
} from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { EIP12ErgoAPI, SignedTransaction } from "@nautilus-js/eip12-types";
import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useChainStore } from "./chainStore";

export const useWalletStore = defineStore("wallet", () => {
  const chain = useChainStore();

  // private
  let _context: EIP12ErgoAPI | undefined;
  let _boxes: Box<Amount>[];
  let _lastBoxFetch = 0;

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

  // watchers
  watch(
    () => chain.height,
    () => {
      getBoxes();
    }
  );

  watch(balance, () => {
    if (some(_balance.value)) {
      chain.loadTokensMetadata(
        balance.value.filter((x) => isUndefined(x.metadata)).map((x) => x.tokenId)
      );
    }
  });

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
    } else {
      localStorage.setItem("firstConnected", "false");
      _loading.value = false;
    }
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
    _boxes = [];
    _lastBoxFetch = 0;

    _loading.value = false;
  }

  async function _fetchData() {
    if (!_context) {
      return;
    }

    _usedAddresses.value = await _context.get_used_addresses();
    _changeAddress.value = await _context.get_change_address();
    const ergBalance = await _context.get_balance();

    _balance.value = [{ tokenId: ERG_TOKEN_ID, amount: ensureBigInt(ergBalance) }];

    if (chain.height > 0) {
      getBoxes();
    }
  }

  async function getBoxes() {
    if (!_context) {
      return [];
    }

    if (Date.now() - _lastBoxFetch < 20000) {
      _loading.value = false;
      return _boxes;
    }

    _boxes = await _context.get_utxos();
    _lastBoxFetch = Date.now();
    updateBalances(_boxes);

    _loading.value = false;

    return _boxes;
  }

  function updateBalances(boxes: Box<Amount>[]) {
    const sum = utxoSum(boxes);

    _balance.value = sum.tokens;
    _balance.value.unshift({ tokenId: ERG_TOKEN_ID, amount: sum.nanoErgs });
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
