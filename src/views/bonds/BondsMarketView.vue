<script setup lang="ts">
import { Box, isEmpty } from "@fleet-sdk/common";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { computed, onMounted, reactive, ref } from "vue";
import BondOrderCard from "./components/BondOrderCard.vue";
import { VERIFIED_ASSETS } from "@/maps";
import { buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { formatBigNumber, parseOpenOrderBox } from "@/utils";
import NewLoanRequestView from "@/views/bonds/NewLoanRequestView.vue";

const { oruga } = useProgrammatic();

const wallet = useWalletStore();
const chain = useChainStore();

const boxes = ref<Readonly<Box<string>>[]>([]);
const loading = reactive({ boxes: true, metadata: true });

const orders = computed(() => {
  return boxes.value.map((box) =>
    parseOpenOrderBox(box, chain.tokensMetadata, chain.priceRates, wallet.usedAddresses)
  );
});

function openNewLoanModal() {
  oruga.modal.open({
    component: NewLoanRequestView,
    width: "30rem"
  });
}

onMounted(async () => {
  loading.boxes = true;
  loading.metadata = true;
  const contracts = VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close"));
  let rawBoxes = await graphQLService.getBoxes({
    ergoTrees: contracts,
    spent: false
  });

  boxes.value = rawBoxes
    .filter((box) => contracts.includes(box.ergoTree))
    .map((box) => Object.freeze(box));
  loading.boxes = false;

  await chain.loadTokensMetadata(boxes.value.flatMap((box) => box.assets.map((t) => t.tokenId)));
  loading.metadata = false;
});
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <div class="flex flex-row justify-between gap-4 items-center">
      <button
        class="btn btn-primary shadow flex-col"
        :disabled="!wallet.connected || wallet.loading"
        @click="openNewLoanModal()"
      >
        New loan request
      </button>

      <div class="stats shadow">
        <div class="stat py-2">
          <div class="stat-desc">Total Value Locked</div>
          <div class="stat-value text-center">${{ formatBigNumber(chain.tvl, 2) }}</div>
        </div>
      </div>
    </div>
    <div
      class="grid grid-cols-1 gap-8 md:gap-12 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <template v-if="loading.boxes">
        <bond-order-card
          v-for="n in 4"
          :key="n"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
      </template>
      <template v-else>
        <bond-order-card
          v-for="order in orders"
          :key="order.box.boxId"
          :order="order"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
      </template>
    </div>
    <div v-if="!loading.boxes && isEmpty(orders)" class="text-7xl text-center w-full pb-20">
      <div class="py-20 opacity-90">No open orders for now.</div>
    </div>
  </div>
</template>
