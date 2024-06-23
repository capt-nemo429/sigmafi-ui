<script setup lang="ts">
import { GraphQLBoxQuery } from "@fleet-sdk/blockchain-providers";
import { Amount, Box, isEmpty, orderBy, some } from "@fleet-sdk/common";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { ArrowDownIcon, ArrowUpIcon } from "@zhuowenli/vue-feather-icons";
import { computed, reactive, Ref, ref, watch } from "vue";
import BondCard from "./components/BondCard.vue";
import BondOrderCard from "./components/BondOrderCard.vue";
import { VERIFIED_ASSETS } from "@/maps";
import { buildBondContract, buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { parseBondBox, parseOpenOrderBox, stringifyBoxAmounts } from "@/utils";
import NewLoanRequestView from "@/views/bonds/NewLoanRequestView.vue";

type MarketTab = "orders" | "ongoing";

type Sorting = {
  by: "newest" | "principal" | "interest" | "ratio" | "term" | "apr";
  asc: boolean;
};

const { oruga } = useProgrammatic();

const wallet = useWalletStore();
const chain = useChainStore();

const orderContracts = VERIFIED_ASSETS.map((a) => buildOrderContract(a.tokenId, "on-close"));
const loanContracts = VERIFIED_ASSETS.map((a) => buildBondContract(a.tokenId));

const orderBoxes = ref<ReadonlyArray<Box<string>>>([]);
const ongoingBoxes = ref<ReadonlyArray<Box<string>>>([]);

const selectedTab = ref<MarketTab>("orders");
const loading = reactive({ boxes: true, metadata: true });
const filter = reactive({ hideUndercollateralizedRequests: true });
const sort = reactive<Sorting>({ by: "newest", asc: false });

const orders = computed(() => {
  return orderBoxes.value.map((box) =>
    parseOpenOrderBox(box, chain.tokensMetadata, chain.priceRates, wallet.usedAddresses)
  );
});

const ongoingLoans = computed(() => {
  return ongoingBoxes.value.map((box) =>
    parseBondBox(box, chain.tokensMetadata, chain.priceRates, chain.height, wallet.usedAddresses)
  );
});

const filteredOrders = computed(() => {
  let filtered = orders.value;

  if (filter.hideUndercollateralizedRequests) {
    filtered = filtered.filter((order) => order.ratio && order.ratio.gte(100));
  }

  const direction = sort.asc ? "asc" : "desc";
  switch (sort.by) {
    case "principal": {
      filtered = orderBy(
        filtered,
        (order) => {
          return order.principal.amount
            .multipliedBy(chain.priceRates[order.principal.tokenId]?.fiat || 0)
            .toNumber();
        },
        direction
      );
      break;
    }
    case "interest": {
      filtered = orderBy(filtered, (order) => order.interest?.percent.toNumber() || 0, direction);
      break;
    }
    case "ratio": {
      filtered = orderBy(filtered, (order) => order.ratio?.toNumber() || 0, direction);
      break;
    }
    case "term": {
      filtered = orderBy(filtered, (order) => order.term.blocks, direction);
      break;
    }
    case "apr": {
      filtered = orderBy(filtered, (order) => order.interest?.apr.toNumber() || 0, direction);
      break;
    }
    case "newest":
    default: {
      filtered = orderBy(filtered, (order) => order.box.creationHeight, direction);
      break;
    }
  }

  return filtered;
});

function openNewLoanModal() {
  oruga.modal.open({
    component: NewLoanRequestView,
    width: "30rem"
  });
}

watch(
  () => selectedTab.value,
  async (newVal) => {
    if (!newVal) {
      orderBoxes.value = [];
      return;
    }

    switch (newVal) {
      case "orders":
        await loadRequests();
        break;
      case "ongoing":
        await loadOngoingLoans();
        break;
    }
  },
  { immediate: true }
);

async function setLoading(state: boolean) {
  loading.boxes = state;
  loading.metadata = state;
}

function loadRequests() {
  return loadData(
    "orders",
    [{ where: { ergoTrees: orderContracts } }],
    orderBoxes,
    (box) => orderContracts.includes(box.ergoTree) && some(box.additionalRegisters)
  );
}

function loadOngoingLoans() {
  return loadData(
    "ongoing",
    [{ where: { ergoTrees: loanContracts } }],
    ongoingBoxes,
    (box) => loanContracts.includes(box.ergoTree) && some(box.additionalRegisters)
  );
}

async function loadData(
  tab: MarketTab,
  queries: GraphQLBoxQuery[],
  boxRef: Ref<ReadonlyArray<Box<string>>>,
  validate: (box: Box<Amount>) => boolean
) {
  setLoading(true);

  boxRef.value = [];
  for (const query of queries) {
    for await (const chunk of graphQLService.streamBoxes(query)) {
      if (selectedTab.value !== tab) break;

      if (some(chunk)) {
        boxRef.value = boxRef.value.concat(
          chunk.filter(validate).map((box) => Object.freeze(stringifyBoxAmounts(box)))
        );

        loading.boxes = false;
        await chain.loadTokensMetadata(chunk.flatMap((x) => x.assets.map((t) => t.tokenId)));
        loading.metadata = false;
      }
    }
  }

  setLoading(false);
}
</script>

<template>
  <div class="grid grid-cols-1 gap-10">
    <div class="flex flex-wrap flex-row justify-between gap-4 items-center pb-2">
      <div class="flex flex-wrap flex-row gap-4 items-center">
        <div class="tabs h-12 tabs-boxed max-w-max">
          <a
            class="tab h-full text-md"
            :class="{
              'tab-active': selectedTab === 'orders'
            }"
            @click="selectedTab = 'orders'"
            >Loan requests</a
          >
          <a
            class="tab h-full text-md"
            :class="{
              'tab-active': selectedTab === 'ongoing'
            }"
            @click="selectedTab = 'ongoing'"
            >Ongoing loans</a
          >
        </div>

        <template v-if="selectedTab === 'orders'">
          <div class="divider divider-horizontal py-1 mx-0"></div>

          <div class="flex gap-4">
            <div class="form-control">
              <div class="input-group">
                <select
                  v-model="sort.by"
                  class="select select-bordered font-normal select-none !outline-none border-l-0"
                >
                  <option value="newest">Newest</option>
                  <option value="principal">Amount</option>
                  <option value="interest">Interest</option>
                  <option value="ratio">Ratio</option>
                  <option value="term">Term</option>
                  <option value="apr">APR</option>
                </select>
                <button class="btn animate-none outline-none" @click="sort.asc = !sort.asc">
                  <arrow-up-icon v-if="sort.asc" />
                  <arrow-down-icon v-else />
                </button>
              </div>
            </div>
            <label class="cursor-pointer label p-0 label-text-alt gap-2">
              <input
                v-model="filter.hideUndercollateralizedRequests"
                type="checkbox"
                class="checkbox"
              />
              <span class="label-text"
                >Hide undercollateralized<br />
                requests</span
              >
            </label>
          </div>
        </template>
      </div>

      <button
        class="btn dark:invert shadow-lg flex-col flex-grow sm:flex-grow-0"
        :disabled="!wallet.connected || wallet.loading"
        @click="openNewLoanModal()"
      >
        New loan request
      </button>
    </div>

    <div
      class="grid grid-cols-1 gap-8 md:gap-12 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <template v-if="selectedTab === 'orders'">
        <template v-if="loading.boxes || (loading.metadata && filteredOrders.length === 0)">
          <bond-order-card
            v-for="n in 4"
            :key="n"
            :loading-box="loading.boxes || loading.metadata"
            :loading-metadata="loading.metadata"
          />
        </template>
        <template v-else>
          <bond-order-card
            v-for="order in filteredOrders"
            :key="order.box.boxId"
            :order="order"
            :loading-box="loading.boxes"
            :loading-metadata="loading.metadata"
          />
        </template>
      </template>
      <template v-else>
        <template v-if="loading.boxes || (loading.metadata && filteredOrders.length === 0)">
          <bond-card
            v-for="n in 4"
            :key="n"
            :display-lender-and-borrower="true"
            :loading-box="loading.boxes"
            :loading-metadata="loading.metadata"
          />
        </template>
        <template v-else>
          <bond-card
            v-for="bond in ongoingLoans"
            :key="bond.box.boxId"
            :display-lender-and-borrower="true"
            :bond="bond"
            :loading-box="loading.boxes"
            :loading-metadata="loading.metadata"
          />
        </template>
      </template>
    </div>
    <div v-if="!loading.boxes && isEmpty(filteredOrders)" class="text-7xl text-center w-full pb-20">
      <div class="py-20 opacity-90">No open orders for now.</div>
    </div>
  </div>
</template>
