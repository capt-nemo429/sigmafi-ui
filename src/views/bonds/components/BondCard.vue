<script setup lang="ts">
import { ERG_TOKEN_ID } from "@/constants";
import { useWalletStore } from "@/stories/walletStore";
import { shortenString, showToast } from "@/utils";
import { Box, decimalize, isDefined } from "@fleet-sdk/common";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { TransactionFactory } from "@/offchain/transactionFactory";
import TxIdNotification from "@/components/TxIdNotification.vue";
import { parseBondBox } from "@/utils/bondUtils";

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

  let blocks = bond.value.term.blocks;

  if (blocks < 0) {
    return 100;
  }

  const totalTerm = wallet.height - props.box.creationHeight;
  return ((blocks / totalTerm) * 100).toFixed(1);
});

const bond = computed(() => {
  if (!props.box) {
    return;
  }

  return parseBondBox(props.box, wallet.metadata, wallet.height, wallet.usedAddresses);
});

async function liquidate() {
  if (!props.box) {
    return;
  }

  try {
    loading.value = true;
    const txId = await TransactionFactory.liquidate(toRaw(props.box));

    const { oruga } = useProgrammatic();
    oruga.notification.open({
      duration: 5000,
      component: TxIdNotification,
      props: { txId }
    });

    loading.value = false;
  } catch (e: any) {
    console.error(e);
    loading.value = false;

    let message = "Unknown error.";
    if (e instanceof Error) {
      message = e.message;
    } else if (isDefined(e.info)) {
      if (e.code === 2) {
        return;
      }

      message = "dApp Connector: " + e.info;
    }

    showToast(message, "alert-error");
  }
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
          <div class="skeleton-placeholder">{{ bond?.repayment }} <small>ERG</small></div>
        </div>
        <div v-if="loadingBox" class="skeleton-fixed h-8 w-8 skeleton-circular"></div>
        <asset-icon v-else class="h-8 w-8 opacity-70" :token-id="ERG_TOKEN_ID" />
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
      <div class="flex">
        <div class="flex-grow">
          <div class="stat-title skeleton-placeholder">Term</div>
          <div class="stat-value skeleton-placeholder flex-grow">
            {{ bond?.term.value }} {{ bond?.term.interval }}
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
          class="btn btn-sm btn-primary flex-grow"
          :disabled="!wallet.connected || loadingBox"
        >
          Repay
        </button>
      </div>
    </div>
  </div>
</template>
