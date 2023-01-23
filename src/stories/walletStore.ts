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
  const _balance = ref<AssetInfo<bigint>[]>([]);
  const _changeAddress = ref<string>();
  const _loading = ref(false);
  const _connected = ref(false);
  const _usedAddresses = ref<string[]>([]);
  const _wallets = ref<{ [key: string]: boolean }>({});
  const _connectedWallet = ref<"nautilus" | "safew" | string | undefined>();

  // computed
  const balance = computed(() =>
    _balance.value.map((asset) => ({
      ...asset,
      metadata: chain.tokensMetadata[asset.tokenId],
      conversion: { rate: chain.priceRates[asset.tokenId]?.fiat, currency: "USD" }
    }))
  );
  const loading = computed(() => _loading.value);
  const changeAddress = computed(() => _changeAddress.value);
  const usedAddresses = computed(() => _usedAddresses.value);
  const connected = computed(() => _connected.value);
  const wallets = computed(() => _wallets.value);
  const connectedWallet = computed(() => _connectedWallet.value);

  // watchers
  watch(
    () => chain.height,
    () => getBoxes()
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
    if (typeof ergoConnector !== "undefined") {
      Object.keys(ergoConnector).map((key) => (_wallets.value[key] = true));
    }

    const connectedWallet = localStorage.getItem("connectedWallet");
    if (connectedWallet) {
      await connect(connectedWallet);
    }
  });

  // actions
  async function connect(walletName: "nautilus" | "safew" | string) {
    if (typeof ergoConnector === "undefined") {
      showToast("Ergo wallet not detected.", "alert-error");

      return;
    }

    const walletConnector = ergoConnector[walletName];
    if (typeof ergoConnector === "undefined" || !walletConnector) {
      showToast(`${walletName} wallet is not detected.`, "alert-error");

      return;
    }

    if (await walletConnector.isConnected()) {
      return;
    }

    const granted = await walletConnector.connect({
      createErgoObject: false
    });

    if (granted) {
      _loading.value = true;
      _context = await walletConnector.getContext();
      const change = ErgoAddress.fromBase58(await _context.get_change_address());
      if (change.network !== getNetworkType()) {
        disconnect();
        showToast("Wrong wallet network.", "alert-error");

        return;
      }

      _connected.value = true;
      _connectedWallet.value = walletName;
      localStorage.setItem("connectedWallet", walletName);
      await _fetchData();
    } else {
      localStorage.removeItem("connectedWallet");
      _connectedWallet.value = undefined;
      _loading.value = false;
    }
  }

  async function disconnect() {
    const connector =
      typeof ergoConnector !== undefined && ergoConnector && _connectedWallet.value
        ? ergoConnector[_connectedWallet.value]
        : undefined;

    if (connector) {
      await connector.disconnect();
    }

    _loading.value = true;
    localStorage.removeItem("connectedWallet");
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
    wallets,
    connectedWallet,
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
