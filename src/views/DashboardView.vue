<script setup lang="ts">
import { QueryBoxesArgs } from "@ergo-graphql/types";
import { Amount, Box, isDefined, isEmpty, some } from "@fleet-sdk/common";
import { ErgoAddress } from "@fleet-sdk/core";
import { computed, reactive, ref, watch } from "vue";
import BondCard from "./bonds/components/BondCard.vue";
import { VERIFIED_ASSETS } from "@/maps";
import { buildBondContract, buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { parseBondBox, parseOpenOrderBox } from "@/utils";
import BondOrderCard from "@/views/bonds/components/BondOrderCard.vue";

type Tab = "orders" | "loans" | "debits";

const chain = useChainStore();
const wallet = useWalletStore();

const selectedTab = ref<Tab>("orders");
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

async function loadOpenOrders(tab: Tab) {
  await loadData(
    tab,
    publicKeys.map((pk) => ({
      pk,
      args: {
        ergoTrees: [
          ...VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close")),
          "101c04000e20472c3d4ecaa08fb7392ff041ee2e6af75f4a558810a74b28600549d5392810e805e80705c09a0c08cd03a11d3028b9bc57b6ac724485e99960b89c278db6bab5d2b961b01aee29405a0205a0060601000e207db936eb6a8d804fdf8faee368ee6f5ce4943246798734cfdf0b0f88d56afc8c040204000400043c041004000580897a0402040404000580897a040201010402040604000580897a040201010101d80cd601b2a5730000d602e4c6a70408d603e4c6a70704d6047301d605e4c6a70505d606e30008d607e67206d6087302d6097303d60a7304d60b957207d801d60b7e720506830244068602720a9d9c7e720806720b7e7209068602e472069d9c7e730506720b7e720906830144068602720a9d9c7e7208067e7205067e720906d60c730695937307cbc27201d806d60d999aa37203e4c672010704d60eb2a5730800d60fdb6308720ed610b2720f730900d611b2720b730a00d6128c721102d1ed96830e0193e4c67201040ec5a793e4c672010508720293e4c672010605e4c6a70605e6c67201080893db63087201db6308a793c17201c1a7927203730b90720d730c92720d730d93c2720ed0720293c1720e730e938c7210017204938c721002720593b1720f730fed95917212720cd803d613b2a5731000d614db63087213d615b272147311009683050193c27213d08c72110193c172137312938c7215017204937e8c72150206721293b1721473137314957207d802d613b2720b731500d6148c72130295917214720cd803d615b2a5731600d616db63087215d617b272167317009683050193c27215d08c72130193c172157318938c7217017204937e8c72170206721493b172167319731a731b7202",
          "101c04000e20003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d005e80705c09a0c08cd03a11d3028b9bc57b6ac724485e99960b89c278db6bab5d2b961b01aee29405a0205a0060601000e207db936eb6a8d804fdf8faee368ee6f5ce4943246798734cfdf0b0f88d56afc8c040204000400043c041004000580897a0402040404000580897a040201010402040604000580897a040201010101d80cd601b2a5730000d602e4c6a70408d603e4c6a70704d6047301d605e4c6a70505d606e30008d607e67206d6087302d6097303d60a7304d60b957207d801d60b7e720506830244068602720a9d9c7e720806720b7e7209068602e472069d9c7e730506720b7e720906830144068602720a9d9c7e7208067e7205067e720906d60c730695937307cbc27201d806d60d999aa37203e4c672010704d60eb2a5730800d60fdb6308720ed610b2720f730900d611b2720b730a00d6128c721102d1ed96830e0193e4c67201040ec5a793e4c672010508720293e4c672010605e4c6a70605e6c67201080893db63087201db6308a793c17201c1a7927203730b90720d730c92720d730d93c2720ed0720293c1720e730e938c7210017204938c721002720593b1720f730fed95917212720cd803d613b2a5731000d614db63087213d615b272147311009683050193c27213d08c72110193c172137312938c7215017204937e8c72150206721293b1721473137314957207d802d613b2720b731500d6148c72130295917214720cd803d615b2a5731600d616db63087215d617b272167317009683050193c27215d08c72130193c172157318938c7217017204937e8c72170206721493b172167319731a731b7202"
        ],
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
        ergoTrees: VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId)),
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
        ergoTrees: VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId)),
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
      boxes.value = boxes.value.concat(
        chunk.filter(validate(query.pk)).map((box) => Object.freeze(box))
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
