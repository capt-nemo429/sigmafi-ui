<script setup lang="ts">
import { ERG_TOKEN_ID } from "@/constants";
import { useWalletStore } from "@/stories/walletStore";
import { sendTransaction, shortenString, parseOpenOrderBox } from "@/utils";
import { Box, decimalize } from "@fleet-sdk/common";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { TransactionFactory } from "@/offchain/transactionFactory";
import CloseOrderConfirm from "./CloseOrderConfirm.vue";
import { useChainStore } from "@/stories";

const { oruga } = useProgrammatic();

const chain = useChainStore();
const wallet = useWalletStore();

const props = defineProps({
  box: { type: Object as PropType<Box<string>>, required: false },
  loadingBox: { type: Boolean, default: false },
  loadingMetadata: { type: Boolean, default: false }
});

const cancelling = ref(false);

const order = computed(() => {
  if (!props.box) {
    return;
  }

  return parseOpenOrderBox(props.box, chain.tokensMetadata, wallet.usedAddresses);
});

function openModal() {
  oruga.modal.open({
    component: CloseOrderConfirm,
    props: { box: props.box },
    width: "30rem"
  });
}

async function cancelOrder() {
  const box = props.box;
  if (!box) {
    return;
  }

  await sendTransaction(async () => {
    return await TransactionFactory.cancelOrder(toRaw(box));
  }, cancelling);
}
</script>

<template>
  <div
    class="stats flex flex-col bg-base-100 stats-vertical shadow"
    :class="{ skeleton: loadingBox }"
  >
    <div class="stat">
      <div class="stat-title skeleton-placeholder">
        {{ order?.term.value }} {{ order?.term.interval }} loan
      </div>
      <div class="stat-value text-success flex items-center gap-1">
        <div class="flex-grow">
          <div class="skeleton-placeholder">{{ order?.amount }} <small>ERG</small></div>
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
        <div v-else v-for="collateral in order?.collateral" :key="collateral.tokenId">
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
                {{ shortenString(collateral.metadata?.name || collateral.tokenId, 15) }}
              </div>
              <div class="">
                {{
                  decimalize(collateral.amount, {
                    decimals: collateral.metadata?.decimals || 0,
                    thousandMark: ","
                  })
                }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow opacity-0"></div>

    <div class="stat">
      <div class="stat-title">Interest</div>
      <div class="flex gap-2">
        <div class="stat-value skeleton-placeholder flex-grow">{{ order?.interest.percent }}%</div>
        <div class="skeleton-placeholder">{{ order?.interest.value }} <small>ERG</small></div>
      </div>
      <div class="stat-desc skeleton-placeholder">{{ order?.interest.apr }}% APR</div>
      <div class="stat-actions text-center flex gap-2">
        <button
          v-if="order?.cancellable"
          @click="cancelOrder()"
          class="btn btn-sm btn-ghost"
          :class="{ loading: cancelling }"
          :disabled="!wallet.connected || loadingBox"
        >
          Cancel
        </button>
        <button
          @click="openModal()"
          class="btn btn-sm btn-primary flex-grow"
          :disabled="!wallet.connected || loadingBox"
        >
          Lend
        </button>
      </div>
    </div>
  </div>
</template>
