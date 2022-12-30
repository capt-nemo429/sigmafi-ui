<script setup lang="ts">
import BondOrderCard from "./components/BondOrderCard.vue";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { useWalletStore } from "@/stories/walletStore";
import NewLoanRequestView from "@/views/bonds/NewLoanRequestView.vue";
import { onMounted, reactive, ref } from "vue";
import { graphQLService } from "@/services/graphqlService";
import { ERG_ON_CLOSE_OPEN_ORDER_CONTRACT } from "@/offchain/plugins";
import { Box, isEmpty } from "@fleet-sdk/common";

const { oruga } = useProgrammatic();
const wallet = useWalletStore();

const boxes = ref<Box<string>[]>();
const loading = reactive({ boxes: false, metadata: true });

function openModal() {
  oruga.modal.open({
    component: NewLoanRequestView,
    props: { msg: "test" },
    trapFocus: true,
    width: "30rem"
  });
}

onMounted(async () => {
  loading.boxes = true;
  boxes.value = await graphQLService.getBoxes([ERG_ON_CLOSE_OPEN_ORDER_CONTRACT]);
  loading.boxes = false;

  loading.metadata = true;
  await wallet.loadTokensMetadata(boxes.value.flatMap((x) => x.assets.map((t) => t.tokenId)));
  loading.metadata = false;
});
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <div class="flex flex-row justify-end">
      <button
        class="btn btn-success shadow flex-col"
        :disabled="!wallet.connected"
        @click="openModal()"
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
      <div class="py-20">No open orders for now.</div>
    </div>
  </div>
</template>
