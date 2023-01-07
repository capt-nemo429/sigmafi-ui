<script setup lang="ts">
import { useWalletStore } from "@/stories/walletStore";
import { Box, isUndefined } from "@fleet-sdk/common";
import { computed, PropType, ref, toRaw } from "vue";
import {
  decimalizeBN,
  formatBigNumber,
  sendTransaction,
  shortenString,
  parseOpenOrderBox
} from "@/utils";
import { decimalize } from "@fleet-sdk/common";
import AssetIcon from "@/components/AssetIcon.vue";
import { ERG_DECIMALS, ERG_TOKEN_ID, EXPLORER_URL, MIN_FEE } from "@/constants";
import BigNumber from "bignumber.js";
import { ExternalLinkIcon } from "@zhuowenli/vue-feather-icons";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { useChainStore } from "@/stories";

const wallet = useWalletStore();
const chain = useChainStore();
const emit = defineEmits(["close"]);

const loading = ref(false);

const props = defineProps({
  box: { type: Object as PropType<Box<string>>, required: false }
});

const fees = computed(() => {
  if (isUndefined(order.value?.amount)) {
    return;
  }

  const amount = new BigNumber(order.value?.amount || 0);
  const contract = amount.multipliedBy(0.005);
  const ui = amount.multipliedBy(0.004);
  const miner = decimalizeBN(new BigNumber(MIN_FEE.toString()), ERG_DECIMALS);

  return formatBigNumber(contract.plus(ui).plus(miner), ERG_DECIMALS);
});

const order = computed(() => {
  if (isUndefined(props.box)) {
    return;
  }

  return parseOpenOrderBox(props.box, chain.tokensMetadata, wallet.usedAddresses);
});

const explorerUrl = new URL(`addresses/${order.value?.borrower}`, EXPLORER_URL).href;

async function closeOrder() {
  const box = props.box;
  if (!box) {
    return;
  }

  await sendTransaction(async () => {
    return await TransactionFactory.closeOrder(toRaw(box));
  }, loading);
  emit("close");
}
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <h3 class="font-semibold text-xl">Lend confirmation</h3>

    <div class="stats stats-vertical bg-base-100">
      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Loan</div>
          <div class="text-xl font-semibold flex items-center text-right gap-2">
            <div class="flex-grow">{{ order?.amount }} <small>ERG</small></div>
            <asset-icon class="h-7 w-7" :token-id="ERG_TOKEN_ID" />
          </div>
        </div>
      </div>
      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Collateral</div>
          <div class="text-lg text-right">
            <div
              class="flex items-center gap-2"
              v-for="collateral in order?.collateral"
              :key="collateral.tokenId"
            >
              <span class="flex-grow">
                {{
                  decimalize(collateral.amount, {
                    decimals: collateral.metadata?.decimals || 0,
                    thousandMark: ","
                  })
                }}
                <small>{{
                  shortenString(collateral.metadata?.name || collateral.tokenId, 15)
                }}</small>
              </span>
              <asset-icon
                class="h-6 w-6"
                :token-id="collateral.tokenId"
                :type="collateral.metadata?.type"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Term</div>
          <div class="text-lg text-right">{{ order?.term.value }} {{ order?.term.interval }}</div>
        </div>
      </div>

      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Interest</div>
          <div class="text-lg text-right">
            {{ order?.interest.value }} <small>ERG</small>
            <div class="text-xs text-right opacity-70">{{ order?.interest.percent }}%</div>
          </div>
        </div>
      </div>

      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Borrower</div>
          <div class="text-lg text-right">
            <a
              :href="explorerUrl"
              class="link link-hover text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ shortenString(order?.borrower, 20) }}
              <external-link-icon class="inline pb-1" />
            </a>
          </div>
        </div>
      </div>

      <div class="stat">
        <div class="grid grid-cols-2">
          <div class="stat-title">Fees</div>
          <div class="text-right">{{ fees }} <small>ERG</small></div>
        </div>
      </div>
    </div>

    <div class="modal-action">
      <button class="btn btn-ghost" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :class="{ loading }" @click="closeOrder()">Confirm</button>
    </div>
  </div>
</template>
