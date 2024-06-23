<script setup lang="ts">
import { ExternalLinkIcon } from "@zhuowenli/vue-feather-icons";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import AssetRow from "@/components/AssetRow.vue";
import BondRatioBadge from "@/components/BondRatioBadge.vue";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { useChainStore } from "@/stories";
import { useWalletStore } from "@/stories/walletStore";
import { addressUrlFor, Bond, shortenString } from "@/utils";
import { sendTransaction } from "@/utils";

const chain = useChainStore();
const wallet = useWalletStore();

const props = defineProps({
  bond: { type: Object as PropType<Bond>, required: false, default: undefined },
  displayLenderAndBorrower: { type: Boolean, default: false },
  loadingBox: { type: Boolean, default: false },
  loadingMetadata: { type: Boolean, default: false }
});

const loading = ref(false);

const termProgress = computed(() => {
  if (!props.bond || !props.bond) {
    return 0;
  }

  let blocksLeft = props.bond.term.blocks;

  if (blocksLeft < 0) {
    return 100;
  }

  const totalTerm = chain.height - props.bond.box.creationHeight + blocksLeft;

  return (((totalTerm - blocksLeft) / totalTerm) * 100).toFixed(1);
});

const blocksLeft = computed(() => {
  if (!props.bond) {
    return "";
  }

  let blocks = props.bond?.term.blocks;

  return `${(blocks < 0 ? blocks * -1 : blocks).toLocaleString()} blocks ${
    blocks < 0 ? "passed" : "left"
  }`;
});

async function liquidate() {
  const box = props.bond?.box;
  if (!box) {
    return;
  }

  await sendTransaction(async () => {
    return await TransactionFactory.liquidate(toRaw(box));
  }, loading);
}

async function repay() {
  const box = props.bond?.box;
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
    class="stats flex flex-col bg-base-100 stats-vertical shadow-xl"
    :class="{ skeleton: loadingBox }"
  >
    <div class="stat">
      <div class="stat-title skeleton-placeholder">Repayment</div>
      <div class="stat-value text-success flex items-center gap-1">
        <div class="flex-grow">
          <asset-row
            :max-name-len="15"
            :asset="bond?.principal"
            mode="amount-then-ticker"
            root-class="items-baseline"
            name-class="text-sm"
          />
        </div>
        <div v-if="loadingBox || !bond" class="skeleton-fixed h-10 w-10 skeleton-circular"></div>
        <asset-icon v-else custom-class="h-10 w-10" :token-id="bond.principal.tokenId" />
      </div>
    </div>

    <div class="stat">
      <div class="h-fit flex justify-between items-center">
        <span class="stat-title">Collateral</span>
        <bond-ratio-badge :ratio="bond?.ratio" />
      </div>

      <div class="grid grid-cols-1 gap-2 mt-2 items-start">
        <div v-if="loadingBox" class="flex flex-row items-center gap-2">
          <div class="skeleton-fixed h-8 w-8 skeleton-circular"></div>
          <div class="flex-grow skeleton-fixed h-5"></div>
          <div class="skeleton-fixed h-5 w-1/3"></div>
        </div>
        <div v-for="collateral in bond?.collateral" v-else :key="collateral.tokenId">
          <div class="flex flex-row items-center gap-2" :class="{ skeleton: loadingMetadata }">
            <asset-icon
              custom-class="h-8 w-8"
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
                  :max-name-len="50"
                  class="w-full"
                  root-class="flex-row-reverse w-full items-center gap-2"
                  amount-class="text-right"
                  name-class="w-full"
                  badge-class="w-5 h-5"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow opacity-0"></div>

    <div class="stat">
      <div class="flex justify-between">
        <div v-if="props.displayLenderAndBorrower || bond?.type === 'debit'">
          <div class="stat-title skeleton-placeholder">Lender</div>
          <a
            :href="addressUrlFor(bond?.lender)"
            class="link link-hover text-sm skeleton-placeholder font-mono"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ shortenString(bond?.lender, 10) }}
            <external-link-icon class="inline pb-1" />
          </a>
        </div>
        <div v-if="props.displayLenderAndBorrower || bond?.type === 'lend'">
          <div class="stat-title skeleton-placeholder">Borrower</div>
          <a
            :href="addressUrlFor(bond?.borrower)"
            class="link link-hover text-sm skeleton-placeholder font-mono"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ shortenString(bond?.lender, 10) }}
            <external-link-icon class="inline pb-1" />
          </a>
        </div>
      </div>
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
      </div>
      <div>
        <progress
          class="progress progress-accent h-1 p-0 m-0"
          :value="termProgress"
          max="100"
        ></progress>
      </div>

      <div class="stat-actions text-center flex gap-2">
        <button
          v-if="bond?.liquidable"
          class="btn btn-sm btn-outline flex-grow"
          :class="{ loading }"
          :disabled="!wallet.connected || loadingBox"
          @click="liquidate()"
        >
          Liquidate
        </button>
        <button
          v-else-if="bond?.repayable"
          :class="{ loading }"
          class="btn btn-sm btn-outline flex-grow"
          :disabled="!wallet.connected || loadingBox"
          @click="repay()"
        >
          Repay
        </button>
      </div>
    </div>
  </div>
</template>
