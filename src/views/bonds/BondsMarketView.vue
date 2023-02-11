<script setup lang="ts">
import { Box, isEmpty, orderBy } from "@fleet-sdk/common";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { ArrowDownIcon, ArrowUpIcon } from "@zhuowenli/vue-feather-icons";
import { computed, onMounted, reactive, ref } from "vue";
import BondOrderCard from "./components/BondOrderCard.vue";
import { VERIFIED_ASSETS } from "@/maps";
import { buildOrderContract } from "@/offchain/plugins";
import { graphQLService } from "@/services/graphqlService";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { parseOpenOrderBox } from "@/utils";
import NewLoanRequestView from "@/views/bonds/NewLoanRequestView.vue";

type Sorting = {
  by: "newest" | "principal" | "interest" | "ratio" | "term" | "apr";
  asc: boolean;
};

const { oruga } = useProgrammatic();

const wallet = useWalletStore();
const chain = useChainStore();

const boxes = ref<Readonly<Box<string>>[]>([]);
const loading = reactive({ boxes: true, metadata: true });
const state = reactive({ hideUndercollateralized: true });
const sort = reactive<Sorting>({ by: "newest", asc: false });

const orders = computed(() => {
  let orders = boxes.value.map((box) =>
    parseOpenOrderBox(box, chain.tokensMetadata, chain.priceRates, wallet.usedAddresses)
  );

  if (state.hideUndercollateralized) {
    orders = orders.filter((order) => order.ratio && order.ratio.gte(100));
  }

  const direction = sort.asc ? "asc" : "desc";
  switch (sort.by) {
    case "principal": {
      orders = orderBy(
        orders,
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
      orders = orderBy(orders, (order) => order.interest?.percent.toNumber() || 0, direction);
      break;
    }
    case "ratio": {
      orders = orderBy(orders, (order) => order.ratio?.toNumber() || 0, direction);
      break;
    }
    case "term": {
      orders = orderBy(orders, (order) => order.term.blocks, direction);
      break;
    }
    case "apr": {
      orders = orderBy(orders, (order) => order.interest?.apr.toNumber() || 0, direction);
      break;
    }
    case "newest":
    default: {
      orders = orderBy(orders, (order) => order.box.creationHeight, direction);
      break;
    }
  }

  return orders;
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

      <div class="flex flex-row gap-4 items-center">
        <label class="cursor-pointer label gap-2">
          <input v-model="state.hideUndercollateralized" type="checkbox" class="checkbox" />
          <span class="label-text">Hide undercollateralized<br />loan requests</span>
        </label>
        <div class="form-control">
          <div class="input-group">
            <select
              v-model="sort.by"
              class="select select-bordered select-none !outline-none border-l-0"
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
        <!-- 
        <div class="stats shadow">
          <div class="stat py-2">
            <div class="stat-desc">Total Value Locked</div>
            <div class="stat-value text-center">${{ formatBigNumber(chain.tvl, 2) }}</div>
          </div>
        </div> -->
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
