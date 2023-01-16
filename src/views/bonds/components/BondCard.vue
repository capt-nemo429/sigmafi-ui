<script setup lang="ts">
import { ERG_TOKEN_ID } from "@/constants";
import { useWalletStore } from "@/stories/walletStore";
import { shortenString, addressUrlFor } from "@/utils";
import { Box } from "@fleet-sdk/common";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { parseBondBox, sendTransaction } from "@/utils";
import { ExternalLinkIcon } from "@zhuowenli/vue-feather-icons";
import { useChainStore } from "@/stories";
import AssetRow from "@/components/AssetRow.vue";

const chain = useChainStore();
const wallet = useWalletStore();

const props = defineProps({
  box: { type: Object as PropType<Box<string>>, required: false },
  loadingBox: { type: Boolean, default: false },
  loadingMetadata: { type: Boolean, default: false }
});

const loading = ref(false);

const termProgress = computed(() => {
  if (!props.box || !bond.value) {
    return 0;
  }

  let blocksLeft = bond.value.term.blocks;

  if (blocksLeft < 0) {
    return 100;
  }

  const totalTerm = chain.height - props.box.creationHeight + blocksLeft;
  return (((totalTerm - blocksLeft) / totalTerm) * 100).toFixed(1);
});

const bond = computed(() => {
  if (!props.box) {
    return;
  }

  return parseBondBox(props.box, chain.tokensMetadata, chain.height, wallet.usedAddresses);
});

const blocksLeft = computed(() => {
  if (!bond.value) {
    return "";
  }

  let blocks = bond.value?.term.blocks;

  return `${(blocks < 0 ? blocks * -1 : blocks).toLocaleString()} blocks ${
    blocks < 0 ? "passed" : "left"
  }`;
});

async function liquidate() {
  const box = props.box;
  if (!box) {
    return;
  }

  await sendTransaction(async () => {
    return await TransactionFactory.liquidate(toRaw(box));
  }, loading);
}

async function repay() {
  const box = props.box;
  if (!box) {
    return;
  }

  await sendTransaction(async () => {
    return await TransactionFactory.repay(toRaw(box));
  }, loading);
}
</script>

<template>
  <div
    class="stats flex flex-col bg-base-100 stats-vertical shadow"
    :class="{ skeleton: loadingBox }"
  >
    <div class="stat">
      <div class="stat-title skeleton-placeholder">Repayment</div>
      <div class="stat-value text-success flex items-center gap-1">
        <div class="flex-grow">
          <asset-row
            :max-name-len="15"
            :asset="bond?.repayment"
            root-class="items-baseline"
            name-class="text-sm"
          />
        </div>
        <div v-if="loadingBox" class="skeleton-fixed h-8 w-8 skeleton-circular"></div>
        <asset-icon v-else class="h-8 w-8" :token-id="ERG_TOKEN_ID" />
      </div>
    </div>

    <div class="stat">
      <div class="stat-title h-fit">Collateral</div>
      <div class="grid grid-cols-1 gap-2 mt-2 items-start">
        <div v-if="loadingBox" class="flex flex-row items-center gap-2">
          <div class="skeleton-fixed h-8 w-8 skeleton-circular"></div>
          <div class="flex-grow skeleton-fixed h-5"></div>
          <div class="skeleton-fixed h-5 w-1/3"></div>
        </div>
        <div v-else v-for="collateral in bond?.collateral" :key="collateral.tokenId">
          <div class="flex flex-row items-center gap-2" :class="{ skeleton: loadingMetadata }">
            <asset-icon
              class="h-8 w-8"
              :token-id="collateral.tokenId"
              :type="collateral.metadata?.type"
            />
            <template v-if="loadingMetadata">
              <div class="flex-grow skeleton-fixed h-5"></div>
              <div class="skeleton-fixed h-5 w-1/3"></div>
            </template>
            <template v-else>
              <div class="flex-grow">
                <asset-row
                  link
                  show-badge
                  :asset="collateral"
                  :max-name-len="15"
                  root-class="flex-row-reverse w-full items-center gap-2"
                  amount-class="w-full text-right"
                  badge-class="w-5 h-5"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow opacity-0"></div>

    <div class="stat" v-if="bond?.type === 'debit'">
      <div class="stat-title skeleton-placeholder">Lender</div>
      <a
        :href="addressUrlFor(bond?.lender)"
        class="link link-hover text-sm skeleton-placeholder"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ shortenString(bond?.lender, 25) }}
        <external-link-icon class="inline pb-1" />
      </a>
    </div>
    <div class="stat" v-else>
      <div class="stat-title skeleton-placeholder">Borrower</div>
      <a
        :href="addressUrlFor(bond?.borrower)"
        class="link link-hover text-sm skeleton-placeholder"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ shortenString(bond?.borrower, 25) }}
        <external-link-icon class="inline pb-1" />
      </a>
    </div>
    <div class="stat">
      <div class="flex">
        <div class="flex-grow">
          <div class="stat-title skeleton-placeholder">Term</div>
          <div class="stat-value skeleton-placeholder flex-grow">
            {{ bond?.term.value }} {{ bond?.term.interval }}
          </div>
          <div class="stat-desc skeleton-placeholder">
            {{ blocksLeft }}
          </div>
        </div>
        <div
          class="radial-progress text-xs"
          :style="`--value: ${termProgress}; --size: 3rem; --thickness: 0.2rem;`"
        >
          {{ termProgress }}%
        </div>
      </div>

      <div class="stat-actions text-center flex gap-2">
        <button
          v-if="bond?.liquidable"
          @click="liquidate()"
          class="btn btn-sm btn-primary flex-grow"
          :class="{ loading }"
          :disabled="!wallet.connected || loadingBox"
        >
          Liquidate
        </button>
        <button
          v-else-if="bond?.repayable"
          @click="repay()"
          :class="{ loading }"
          class="btn btn-sm btn-primary flex-grow"
          :disabled="!wallet.connected || loadingBox"
        >
          Repay
        </button>
      </div>
    </div>
  </div>
</template>
