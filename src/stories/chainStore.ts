import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { graphQLService } from "@/services/graphqlService";
import { AssetInfo, AssetMetadata } from "@/types";
import { getNetworkType, showToast } from "@/utils";
import { isEmpty, isUndefined, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { EIP12ErgoAPI } from "@nautilus-js/eip12-types";
import { throttle, uniq } from "lodash-es";
import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from "vue";

export type StateTokenMetadata = { [tokenId: string]: AssetMetadata };

export const useChainStore = defineStore("chain", () => {
  // private
  let _timer: NodeJS.Timer;

  // private state
  const _loading = ref(true);
  const _height = ref<number>(0);

  const _metadata = ref<StateTokenMetadata>({
    [ERG_TOKEN_ID]: { name: "ERG", decimals: ERG_DECIMALS }
  });

  // computed
  const tokensMetadata = computed(() => _metadata.value);
  const loading = computed(() => _loading.value);
  const height = computed(() => _height.value);

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

  return {
    loadTokensMetadata,
    tokensMetadata,
    loading,
    height
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChainStore, import.meta.hot));
}
