<script setup lang="ts">
import BondOrderCard from "./bonds/components/BondOrderCard.vue";
import { useWalletStore } from "@/stories/walletStore";
import { reactive, ref, watch } from "vue";
import { graphQLService } from "@/services/graphqlService";
import { ORDER_ON_CLOSE_ERG_CONTRACT } from "@/offchain/plugins";
import { Box, isEmpty } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";

const wallet = useWalletStore();

const selectedTab = ref<"orders" | "loans" | "debits">("orders");
const orderBoxes = ref<Box<string>[]>();
const loading = reactive({ boxes: true, metadata: true });

let publicKey: string | undefined = undefined;

watch(
  () => {
    return {
      address: wallet.changeAddress,
      tab: selectedTab.value
    };
  },
  async (newVal, oldVal) => {
    if (!newVal || !newVal.address) {
      orderBoxes.value = [];
      return;
    }

    if (newVal.address !== oldVal?.address) {
      publicKey = ErgoAddress.fromBase58(newVal.address).ergoTree.substring(2);
    }
    if (!publicKey) {
      return;
    }

    orderBoxes.value = [];

    await loadOpenOrders(publicKey);
  },
  { immediate: true }
);

async function setLoading() {
  loading.boxes = true;
  loading.metadata = true;
}

async function loadOpenOrders(publicKey: string) {
  setLoading();

  orderBoxes.value = await graphQLService.getBoxes({
    ergoTrees: [ORDER_ON_CLOSE_ERG_CONTRACT],
    registers: { R4: publicKey },
    spent: false
  });
  loading.boxes = false;

  await wallet.loadTokensMetadata(orderBoxes.value.flatMap((x) => x.assets.map((t) => t.tokenId)));
  loading.metadata = false;
}
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <div class="tabs tabs-boxed max-w-max">
      <a
        class="tab text-md"
        :class="{ 'tab-active': selectedTab === 'orders' }"
        @click="selectedTab = 'orders'"
        >Open orders</a
      >
      <a
        class="tab text-md"
        :class="{ 'tab-active': selectedTab === 'loans' }"
        @click="selectedTab = 'loans'"
        >Loans</a
      >
      <a
        class="tab text-md"
        :class="{ 'tab-active': selectedTab === 'debits' }"
        @click="selectedTab = 'debits'"
        >Debits</a
      >
    </div>

    <div
      class="grid grid-cols-1 gap-8 md:gap-12 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <bond-order-card
        v-if="loading.boxes"
        :loading-box="loading.boxes"
        :loading-metadata="loading.metadata"
      />
      <bond-order-card
        v-else
        v-for="box in orderBoxes"
        :box="box"
        :loading-box="loading.boxes"
        :loading-metadata="loading.metadata"
        :key="box.boxId"
      />
    </div>
    <div v-if="!loading.boxes && isEmpty(orderBoxes)" class="text-7xl text-center w-full pb-20">
      <div class="py-20">No open orders for now.</div>
    </div>
  </div>
</template>
