<script setup lang="ts">
import { useWalletStore } from "@/stories/walletStore";
import { Box, isUndefined } from "@fleet-sdk/common";
import { computed, PropType, ref, toRaw } from "vue";
import { sendTransaction, shortenString, parseOpenOrderBox, addressUrlFor } from "@/utils";
import AssetIcon from "@/components/AssetIcon.vue";
import { ERG_TOKEN_ID } from "@/constants";
import { ExternalLinkIcon } from "@zhuowenli/vue-feather-icons";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { useChainStore } from "@/stories";
import AssetRow from "@/components/AssetRow.vue";

const wallet = useWalletStore();
const chain = useChainStore();
const emit = defineEmits(["close"]);

const loading = ref(false);

const props = defineProps({
  box: { type: Object as PropType<Box<string>>, required: false }
});

const fees = computed(() => {
  if (isUndefined(order.value)) {
    return;
  }

  const amount = order.value.loan.amount;
  const contract = amount.multipliedBy(0.005);
  const ui = amount.multipliedBy(0.004);

  return contract.plus(ui);
});

const order = computed(() => {
  if (isUndefined(props.box)) {
    return;
  }

  return parseOpenOrderBox(props.box, chain.tokensMetadata, wallet.usedAddresses);
});

async function closeOrder() {
  const box = props.box;
  if (!box) {
    return;
  }

  const sent = await sendTransaction(async () => {
    return await TransactionFactory.closeOrder(toRaw(box));
  }, loading);

  if (sent) {
    emit("close");
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-8">
    <h3 class="font-semibold text-xl">Lend confirmation</h3>

    <div class="stats stats-vertical bg-base-100">
      <div class="stat">
        <div class="flex flex-row gap-1">
          <div class="stat-title">Loan</div>
          <div class="text-xl font-semibold flex items-center w-full text-right gap-2">
            <asset-row
              :max-name-len="15"
              :asset="order?.loan"
              root-class="items-baseline w-full justify-end"
              name-class="text-sm"
            />
            <asset-icon v-if="order" class="h-7 w-7" :token-id="order.loan.tokenId" />
          </div>
        </div>
      </div>
      <div class="stat">
        <div class="flex flex-row gap-1">
          <div class="stat-title">Collateral</div>
          <div class="text-lg text-right w-full">
            <div
              class="flex items-center gap-2 whitespace-nowrap"
              v-for="collateral in order?.collateral"
              :key="collateral.tokenId"
            >
              <div class="flex-grow flex items-center justify-end gap-2">
                <asset-row
                  link
                  show-badge
                  :asset="collateral"
                  :max-name-len="12"
                  root-class="w-full items-baseline"
                  amount-class="w-full text-right"
                  name-class="text-sm"
                  badge-class="w-5 h-5"
                />
              </div>
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
        <div class="flex flex-row gap-1">
          <div class="stat-title">Term</div>
          <div class="text-lg text-right w-full">
            {{ order?.term.value }} {{ order?.term.interval }}
          </div>
        </div>
      </div>

      <div class="stat">
        <div class="flex flex-row gap-1">
          <div class="stat-title">Interest</div>
          <div class="text-lg text-right w-full">
            <asset-row
              :asset="order?.interest"
              name-class="text-sm"
              root-class="items-baseline w-full justify-end"
            />
            <div class="text-xs text-right opacity-70">{{ order?.interest.percent }}%</div>
          </div>
        </div>
      </div>

      <div class="stat">
        <div class="flex flex-row gap-1">
          <div class="stat-title">Borrower</div>
          <div class="text-lg text-right w-full">
            <a
              :href="addressUrlFor(order?.borrower)"
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
        <div class="flex flex-row gap-1">
          <div class="stat-title">Service Fees</div>
          <asset-row
            :asset="
              fees && order
                ? { amount: fees, tokenId: order.loan.tokenId, metadata: order.loan.metadata }
                : undefined
            "
            name-class="text-sm"
            root-class="items-baseline w-full justify-end"
          />
        </div>
      </div>
    </div>

    <div class="modal-action">
      <button class="btn btn-ghost" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :class="{ loading }" @click="closeOrder()">Confirm</button>
    </div>
  </div>
</template>
