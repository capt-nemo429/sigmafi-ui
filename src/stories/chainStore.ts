import { AddressBalance } from "@ergo-graphql/types";
import { first, isEmpty, NonMandatoryRegisters } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { utf8 } from "@fleet-sdk/crypto";
import { parse } from "@fleet-sdk/serializer";
import BigNumber from "bignumber.js";
import { uniq } from "lodash-es";
import { defineStore } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AssetPriceRates, assetPricingService } from "../services/assetPricingService";
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { VERIFIED_ASSETS } from "@/maps/verifiedAssets";
import { buildBondContract, buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { AssetMetadata, AssetType } from "@/types";
import { decimalizeBigNumber, getNetworkType, toDict } from "@/utils";

export type StateTokenMetadata = { [tokenId: string]: AssetMetadata };

const CONTRACT_ADDRESSES = [
  ...VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close")),
  ...VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId))
].map((contract) => ErgoAddress.fromErgoTree(contract).encode(getNetworkType()));

export const useChainStore = defineStore("chain", () => {
  // private
  let _timer: number;

  // private state
  const _loading = ref(true);
  const _height = ref<number>(0);
  const _priceRates = ref<AssetPriceRates>({});
  const _tvl = ref<AddressBalance[]>([]);

  const _metadata = ref<StateTokenMetadata>(
    toDict(VERIFIED_ASSETS, (a) => ({ [a.tokenId]: a.metadata }))
  );

  // computed
  const tokensMetadata = computed(() => _metadata.value);
  const priceRates = computed(() => _priceRates.value);
  const loading = computed(() => _loading.value);
  const height = computed(() => _height.value);
  const tvl = computed(() => {
    if (!_tvl.value || isEmpty(_tvl.value)) {
      return;
    }

    const rates = _priceRates.value;
    let acc = BigNumber(0);
    for (const balance of _tvl.value) {
      acc = acc.plus(decimalizeBigNumber(BigNumber(balance.nanoErgs), ERG_DECIMALS));
      for (const token of balance.assets) {
        const amount = decimalizeBigNumber(BigNumber(token.amount.toString()), token.decimals || 0);
        acc = acc.plus(amount.times(rates[token.tokenId]?.erg || 0));
      }
    }

    return acc.times(rates[ERG_TOKEN_ID].fiat);
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

    for await (const tokensMetadata of graphQLService.streamTokenMetadata(tokenIds)) {
      for (const metadata of tokensMetadata) {
        const registers = metadata.box.additionalRegisters as NonMandatoryRegisters;

        const parsedMetadata: AssetMetadata = {
          name: metadata?.name || undefined,
          decimals: metadata.decimals || undefined,
          type:
            registers?.R7 && registers.R7.startsWith("0e02") && registers.R7.length === 8
              ? (registers.R7?.substring(4) as AssetType)
              : undefined
        };

        if (parsedMetadata.type === AssetType.PictureArtwork && registers.R9) {
          let r9 = parse<Uint8Array | Uint8Array[]>(registers.R9, "safe");
          if (r9 instanceof Array) {
            r9 = first(r9);
          }

          if (r9) {
            parsedMetadata.url = utf8.encode(r9);
          }
        }

        _metadata.value[metadata.tokenId] = parsedMetadata;
      }
    }

    if (_loading.value) {
      _loading.value = false;
    }
  }

  async function loadPriceRates() {
    const tokens = await assetPricingService.getTokenRates();
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
