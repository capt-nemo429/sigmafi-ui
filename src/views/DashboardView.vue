<script setup lang="ts">
import BondOrderCard from "@/views/bonds/components/BondOrderCard.vue";
import { useWalletStore } from "@/stories/walletStore";
import { reactive, ref, watch } from "vue";
import { graphQLService } from "@/services/graphqlService";
import { BOND_ERG_CONTRACT, ORDER_ON_CLOSE_ERG_CONTRACT } from "@/offchain/plugins";
import { Amount, Box, first, isDefined, isEmpty, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { QueryBoxesArgs } from "@ergo-graphql/types";
import BondCard from "./bonds/components/BondCard.vue";
import { useChainStore } from "@/stories";

const chain = useChainStore();
const wallet = useWalletStore();

type Tab = "orders" | "loans" | "debits";

const selectedTab = ref<Tab>("orders");
const boxes = ref<Box<string>[]>([]);
const loading = reactive({ boxes: true, metadata: true });

let publicKeys: string[] = [];

watch(
  () => {
    return {
      address: wallet.changeAddress,
      tab: selectedTab.value
    };
  },
  async (newVal, oldVal) => {
    if (!newVal || !newVal.address) {
      boxes.value = [];
      return;
    }

    if (newVal.address !== oldVal?.address) {
      publicKeys = [];
    }

    if (isEmpty(publicKeys)) {
      if (isEmpty(wallet.usedAddresses)) {
        setLoading(false);
        return;
      }

      publicKeys = wallet.usedAddresses.map((addr) =>
        ErgoAddress.fromBase58(addr).ergoTree.substring(2)
      );
    }

    switch (newVal.tab) {
      case "loans":
        await loadLoans(newVal.tab);
        break;
      case "debits":
        await loadDebits(newVal.tab);
        break;
      case "orders":
      default:
        await loadOpenOrders(newVal.tab);
        break;
    }
  },
  { immediate: true }
);

async function setLoading(state: boolean) {
  loading.boxes = state;
  loading.metadata = state;
}

async function loadOpenOrders(tab: Tab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      args: {
        ergoTrees: [ORDER_ON_CLOSE_ERG_CONTRACT],
        spent: false,
        registers: { R4: pk }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R4) && box.additionalRegisters.R4 === pk
  );
}

async function loadLoans(tab: Tab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      args: {
        ergoTrees: [BOND_ERG_CONTRACT],
        spent: false,
        registers: { R8: pk }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R8) && box.additionalRegisters.R8 === pk
  );
}

async function loadDebits(tab: Tab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      args: {
        ergoTrees: [BOND_ERG_CONTRACT],
        spent: false,
        registers: { R5: pk }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R5) && box.additionalRegisters.R5 === pk
  );
}

async function loadData(
  tab: Tab,
  queries: { args: QueryBoxesArgs; pk: string }[],
  validate: (pk: string) => (box: Box<Amount>) => boolean
) {
  setLoading(true);

  boxes.value = [];
  for (const query of queries) {
    const chunk = await graphQLService.getBoxes(query.args);

    if (selectedTab.value !== tab) {
      break;
    }

    if (some(chunk)) {
      boxes.value = boxes.value.concat(chunk.filter(validate(query.pk)));

      loading.boxes = false;
      await chain.loadTokensMetadata(chunk.flatMap((x) => x.assets.map((t) => t.tokenId)));
      loading.metadata = false;
    }
  }

  setLoading(false);
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
      <template v-if="selectedTab === 'orders'">
        <bond-order-card
          v-if="loading.boxes"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
        <bond-order-card
          v-else
          v-for="box in boxes"
          :box="box"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
          :key="box.boxId"
        />
      </template>
      <template v-else>
        <bond-card
          v-if="loading.boxes"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
        <bond-card
          v-else
          v-for="box in boxes"
          :box="box"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
          :key="box.boxId"
        />
      </template>
    </div>
    <div v-if="!loading.boxes && isEmpty(boxes)" class="text-7xl text-center w-full pb-20">
      <div class="py-20 opacity-90">Nothing to show yet.</div>
    </div>
  </div>
</template>