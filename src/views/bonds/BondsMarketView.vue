<script setup lang="ts">
import BondOrderCard from "./components/BondOrderCard.vue";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { useWalletStore } from "@/stories/walletStore";
import NewLoanRequestView from "@/views/bonds/NewLoanRequestView.vue";
import { onMounted, reactive, ref } from "vue";
import { graphQLService } from "@/services/graphqlService";
import { buildOrderContract } from "@/offchain/plugins";
import { Box, isEmpty } from "@fleet-sdk/common";
import { useChainStore } from "@/stories";
import { VERIFIED_ASSETS } from "@/maps";

const { oruga } = useProgrammatic();

const wallet = useWalletStore();
const chain = useChainStore();

const boxes = ref<Box<string>[]>();
const loading = reactive({ boxes: true, metadata: true });

function openNewLoanModal() {
  oruga.modal.open({
    component: NewLoanRequestView,
    width: "30rem"
  });
}

onMounted(async () => {
  loading.boxes = true;
  loading.metadata = true;

  boxes.value = await graphQLService.getBoxes({
    ergoTrees: VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close")),
    spent: false
  });
  loading.boxes = false;

  await chain.loadTokensMetadata(boxes.value.flatMap((x) => x.assets.map((t) => t.tokenId)));
  loading.metadata = false;
});
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <div class="flex flex-row justify-end">
      <button
        class="btn btn-success shadow flex-col"
        :disabled="!wallet.connected || wallet.loading"
        @click="openNewLoanModal()"
      >
        New loan request
      </button>
    </div>
    <div
      class="grid grid-cols-1 gap-8 md:gap-12 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <bond-order-card
        v-if="loading.boxes"
        v-for="n in 4"
        :loading-box="loading.boxes"
        :loading-metadata="loading.metadata"
        :key="n"
      />
      <bond-order-card
        v-else
        v-for="box in boxes"
        :box="box"
        :loading-box="loading.boxes"
        :loading-metadata="loading.metadata"
        :key="box.boxId"
      />
    </div>
    <div v-if="!loading.boxes && isEmpty(boxes)" class="text-7xl text-center w-full pb-20">
      <div class="py-20 opacity-90">No open orders for now.</div>
    </div>
  </div>
</template>
