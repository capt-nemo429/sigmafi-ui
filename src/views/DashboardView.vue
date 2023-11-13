<script setup lang="ts">
import { GraphQLBoxQuery } from "@fleet-sdk/blockchain-providers";
import { Amount, Box, isDefined, isEmpty, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { computed, reactive, ref, watch } from "vue";
import BondCard from "./bonds/components/BondCard.vue";
import { VERIFIED_ASSETS } from "@/maps";
import { buildBondContract, buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { parseBondBox, parseOpenOrderBox, stringifyBoxAmounts } from "@/utils";
import BondOrderCard from "@/views/bonds/components/BondOrderCard.vue";

type DashboardTab = "orders" | "loans" | "debits";

const chain = useChainStore();
const wallet = useWalletStore();

const selectedTab = ref<DashboardTab>("orders");
const boxes = ref<Readonly<Box<string>>[]>([]);
const loading = reactive({ boxes: true, metadata: true });

const orders = computed(() => {
  if (selectedTab.value !== "orders") {
    return [];
  }

  return boxes.value.map((box) =>
    parseOpenOrderBox(box, chain.tokensMetadata, chain.priceRates, wallet.usedAddresses)
  );
});

const bonds = computed(() => {
  if (selectedTab.value !== "loans" && selectedTab.value !== "debits") {
    return [];
  }

  return boxes.value.map((box) =>
    parseBondBox(box, chain.tokensMetadata, chain.priceRates, chain.height, wallet.usedAddresses)
  );
});

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

async function loadOpenOrders(tab: DashboardTab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      query: {
        where: {
          ergoTrees: VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close")),
          registers: { R4: pk }
        }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R4) && box.additionalRegisters.R4 === pk
  );
}

async function loadLoans(tab: DashboardTab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      query: {
        where: {
          ergoTrees: VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId)),
          registers: { R8: pk }
        }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R8) && box.additionalRegisters.R8 === pk
  );
}

async function loadDebits(tab: DashboardTab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      query: {
        where: {
          ergoTrees: VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId)),
          registers: { R5: pk }
        }
      }
    })),
    (pk) => (box) => isDefined(box.additionalRegisters.R5) && box.additionalRegisters.R5 === pk
  );
}

async function loadData(
  tab: DashboardTab,
  requests: { query: GraphQLBoxQuery; pk: string }[],
  validate: (pk: string) => (box: Box<Amount>) => boolean
) {
  setLoading(true);

  boxes.value = [];
  for (const request of requests) {
    const chunk = await graphQLService.getBoxes(request.query);

    if (selectedTab.value !== tab) {
      break;
    }

    if (some(chunk)) {
      boxes.value = boxes.value.concat(
        chunk.filter(validate(request.pk)).map((box) => Object.freeze(stringifyBoxAmounts(box)))
      );

      loading.boxes = false;
      await chain.loadTokensMetadata(chunk.flatMap((x) => x.assets.map((t) => t.tokenId)));
      loading.metadata = false;
    }
  }

  setLoading(false);
}
</script>

<template>
  <div class="grid grid-cols-1 gap-10">
    <div class="tabs h-12 tabs-boxed max-w-max mb-2">
      <a
        class="tab h-full text-md"
        :class="{ 'tab-active': selectedTab === 'orders' }"
        @click="selectedTab = 'orders'"
        >Open orders</a
      >
      <a
        class="tab h-full text-md"
        :class="{ 'tab-active': selectedTab === 'loans' }"
        @click="selectedTab = 'loans'"
        >Loans</a
      >
      <a
        class="tab h-full text-md"
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
          v-for="order in orders"
          v-else
          :key="order.box.boxId"
          :order="order"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
      </template>
      <template v-else>
        <bond-card
          v-if="loading.boxes"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
        <bond-card
          v-for="bond in bonds"
          v-else
          :key="bond.box.boxId"
          :bond="bond"
          :loading-box="loading.boxes"
          :loading-metadata="loading.metadata"
        />
      </template>
    </div>
    <div v-if="!loading.boxes && isEmpty(boxes)" class="text-7xl text-center w-full">
      <div class="opacity-90">Nothing to show yet.</div>
    </div>
  </div>
</template>
