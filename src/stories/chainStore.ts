import { isEmpty } from "@fleet-sdk/common";
import { uniq } from "lodash-es";
import { acceptHMRUpdate, defineStore } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { VERIFIED_ASSETS } from "@/maps/verifiedAssets";
import { graphQLService } from "@/services/graphqlService";
import { AssetPriceRate, spectrumService } from "@/services/spectrumService";
import { AssetMetadata } from "@/types";
import { toDict } from "@/utils";

export type StateTokenMetadata = { [tokenId: string]: AssetMetadata };

export const useChainStore = defineStore("chain", () => {
  // private
  let _timer: NodeJS.Timer;

  // private state
  const _loading = ref(true);
  const _height = ref<number>(0);
  const _priceRates = ref<AssetPriceRate>({});

  const _metadata = ref<StateTokenMetadata>(
    toDict(VERIFIED_ASSETS, (a) => ({ [a.tokenId]: a.metadata }))
  );

  // computed
  const tokensMetadata = computed(() => _metadata.value);
  const priceRates = computed(() => _priceRates.value);
  const loading = computed(() => _loading.value);
  const height = computed(() => _height.value);

  // watchers
  watch(
    height,
    (newVal, oldVal) => {
      if (newVal > 0 && !oldVal && !isEmpty(_metadata.value)) {
        return;
      }

      loadPriceRates();
    },
    { immediate: true }
  );

  // hooks
  onMounted(async () => {
    _height.value = (await graphQLService.getCurrentHeight()) || 0;

    _timer = setInterval(async () => {
      const height = await graphQLService.getCurrentHeight();
      if (height && _height.value !== height) {
        _height.value = height;
      }
    }, 5000);

    _loading.value = false;
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
  }

  async function loadPriceRates() {
    const tokens = await spectrumService.getTokenRates();
    _priceRates.value = tokens;
  }

  return {
    loadTokensMetadata,
    tokensMetadata,
    priceRates,
    loading,
    height
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChainStore, import.meta.hot));
}
