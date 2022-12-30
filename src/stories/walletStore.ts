import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { graphQLService } from "@/services/graphqlService";
import { AssetInfo, AssetMetadata } from "@/types";
import { showToast } from "@/utils";
import { isEmpty, isUndefined, Network, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { EIP12ErgoAPI } from "@nautilus-js/eip12-types";
import { uniq } from "lodash-es";
import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, onBeforeMount, ref } from "vue";

export const useWalletStore = defineStore("wallet", () => {
  // private
  let _context: EIP12ErgoAPI | undefined;

  // private state
  let _balance = ref<AssetInfo[]>([]);
  let _changeAddress = ref<string>();
  let _loading = ref(false);
  let _connected = ref(false);
  let _usedAddresses = ref<string[]>([]);
  let _metadata = ref<{ [tokenId: string]: AssetMetadata }>({
    [ERG_TOKEN_ID]: { name: "ERG", decimals: ERG_DECIMALS }
  });

  // computed
  const balance = computed(() =>
    _balance.value.map((asset) => ({ ...asset, metadata: _metadata.value[asset.tokenId] }))
  );
  const metadata = computed(() => _metadata.value);
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
    if (ergoConnector?.nautilus) {
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
        if (change.network !== Network.Testnet) {
          disconnect();
          showToast(
            "Wrong network. This dApp is running on Testnet, but your wallet is a Mainnet wallet.",
            "alert-error"
          );

          return;
        }

        _connected.value = true;
        localStorage.setItem("firstConnected", "true");
        await _fetchData();
        if (some(balance.value)) {
          loadTokensMetadata(
            balance.value.filter((x) => isUndefined(x.metadata)).map((x) => x.tokenId)
          );
        }
      } else {
        localStorage.setItem("firstConnected", "false");
      }

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
    _changeAddress.value = undefined;
    _usedAddresses.value = [];
    _balance.value = [];
    _connected.value = false;

    _loading.value = false;
  }

  async function _fetchData() {
    if (!_context) {
      return;
    }

    _changeAddress.value = await _context.get_change_address();
    _usedAddresses.value = await _context.get_unused_addresses();
    _usedAddresses.value.push(_changeAddress.value);

    _balance.value = (await _context.get_balance("all")).map((b) => ({
      tokenId: b.tokenId,
      amount: BigInt(b.balance),
      metadata: _metadata.value[b.tokenId]
    }));
  }

  async function loadTokensMetadata(tokenIds: string[]) {
    const metadataTokenIds = Object.keys(_metadata);
    tokenIds = tokenIds.filter((id) => !metadataTokenIds.includes(id));
    if (isEmpty(tokenIds)) {
      return;
    }

    tokenIds = uniq(tokenIds);

    for await (const tokensMetadata of graphQLService.yeldTokensMetadata(tokenIds)) {
      for (const metadata of tokensMetadata) {
        _metadata.value[metadata.tokenId] = {
          name: metadata?.name || undefined,
          decimals: metadata.decimals || undefined
        };
      }
    }
  }

  function getContext() {
    if (!_context) {
      throw new Error("Wallet not connected.");
    }

    return _context;
  }

  return {
    connect,
    disconnect,
    getContext,
    loadTokensMetadata,
    metadata,
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
