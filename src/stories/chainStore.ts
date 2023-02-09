import { BoxAmounts, isEmpty } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import BigNumber from "bignumber.js";
import { uniq } from "lodash-es";
import { defineStore } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { VERIFIED_ASSETS } from "@/maps/verifiedAssets";
import { buildBondContract, buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { AssetPriceRate, spectrumService } from "@/services/spectrumService";
import { AssetMetadata } from "@/types";
import { decimalizeBigNumber, getNetworkType, toDict } from "@/utils";

export type StateTokenMetadata = { [tokenId: string]: AssetMetadata };

const CONTRACT_ADDRESSES = [
  ...VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close")),
  ...VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId))
].map((contract) => ErgoAddress.fromErgoTree(contract).encode(getNetworkType()));

export const useChainStore = defineStore("chain", () => {
  // private
  let _timer: NodeJS.Timer;

  // private state
  const _loading = ref(true);
  const _height = ref<number>(0);
  const _priceRates = ref<AssetPriceRate>({});
  const _tvl = ref<BoxAmounts | undefined>();

  const _metadata = ref<StateTokenMetadata>(
    toDict(VERIFIED_ASSETS, (a) => ({ [a.tokenId]: a.metadata }))
  );

  // computed
  const tokensMetadata = computed(() => _metadata.value);
  const priceRates = computed(() => _priceRates.value);
  const loading = computed(() => _loading.value);
  const height = computed(() => _height.value);
  const tvl = computed(() => {
    if (!_tvl.value || !_tvl.value.nanoErgs || _loading.value) {
      return;
    }

    const rates = _priceRates.value;
    let ergs = decimalizeBigNumber(BigNumber(_tvl.value.nanoErgs.toString()), ERG_DECIMALS);
    for (const token of _tvl.value.tokens) {
      ergs = ergs.plus(
        decimalizeBigNumber(
          BigNumber(token.amount.toString()),
          _metadata.value[token.tokenId]?.decimals || 0
        ).times(rates[token.tokenId]?.erg || 0)
      );
    }

    return ergs.plus(rates[ERG_TOKEN_ID].fiat);
  });

  // watchers
  watch(
    height,
    (newVal, oldVal) => {
      if (newVal > 0 && !oldVal && !isEmpty(_metadata.value)) {
        return;
      }

      loadPriceRates();
      loadTVL();
    },
    { immediate: true }
  );

  // hooks
  onMounted(async () => {
    const pricesStr = localStorage.getItem("prices");
    if (pricesStr) {
      _priceRates.value = JSON.parse(pricesStr);
    }

    _height.value = (await graphQLService.getCurrentHeight()) || 0;

    _timer = setInterval(async () => {
      const height = await graphQLService.getCurrentHeight();
      if (height && _height.value !== height) {
        _height.value = height;
      }
    }, 5000);
  });

  onBeforeUnmount(() => {
    clearInterval(_timer);
  });

  // actions
  async function loadTokensMetadata(tokenIds: string[]) {
    const metadataTokenIds = Object.keys(_metadata.value);
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

    if (_loading.value) {
      _loading.value = false;
    }
  }

  async function loadPriceRates() {
    const tokens = await spectrumService.getTokenRates();
    _priceRates.value = tokens;

    localStorage.setItem("prices", JSON.stringify(tokens));
  }

  async function loadTVL() {
    _tvl.value = await graphQLService.getBalance(CONTRACT_ADDRESSES);
  }

  return {
    loadTokensMetadata,
    tokensMetadata,
    priceRates,
    loading,
    height,
    tvl
  };
});
