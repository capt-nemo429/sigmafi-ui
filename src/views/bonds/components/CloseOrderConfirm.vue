<script setup lang="ts">
import { isUndefined } from "@fleet-sdk/common";
import { ExternalLinkIcon } from "@zhuowenli/vue-feather-icons";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import AssetRow from "@/components/AssetRow.vue";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { addressUrlFor, Order, sendTransaction, shortenString } from "@/utils";

const emit = defineEmits(["close"]);
const props = defineProps({
  order: { type: Object as PropType<Order>, required: false, default: undefined }
});

const loading = ref(false);

const fees = computed(() => {
  if (isUndefined(props.order)) {
    return;
  }

  const amount = props.order.principal.amount;
  const contract = amount.multipliedBy(0.005);
  const ui = amount.multipliedBy(0.004);

  return contract.plus(ui);
});

async function closeOrder() {
  const box = props.order?.box;
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
              mode="amount-then-ticker"
              :max-name-len="15"
              :asset="order?.principal"
              root-class="items-baseline w-full justify-end"
              name-class="text-sm"
              class="w-full"
            />
            <asset-icon v-if="order" custom-class="h-7 w-7" :token-id="order.principal.tokenId" />
          </div>
        </div>
      </div>
      <div class="stat">
        <div class="flex flex-row gap-1">
          <div class="stat-title">Collateral</div>
          <div class="text-lg text-right w-full">
            <div
              v-for="collateral in order?.collateral"
              :key="collateral.tokenId"
              class="flex items-center gap-2 whitespace-nowrap"
            >
              <div class="flex-grow flex items-center justify-end gap-2">
                <asset-row
                  link
                  show-badge
                  mode="amount-then-ticker"
                  :asset="collateral"
                  :max-name-len="12"
                  root-class="w-full items-baseline"
                  amount-class="w-full text-right"
                  name-class="text-sm"
                  badge-class="w-5 h-5"
                />
              </div>
              <asset-icon
                custom-class="h-7 w-7"
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
              mode="amount-then-ticker"
              name-class="text-sm"
              root-class="items-baseline w-full justify-end"
            />
            <div class="text-xs text-right opacity-70">{{ order?.interest?.percent }}%</div>
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
                ? {
                    amount: fees,
                    tokenId: order.principal.tokenId,
                    metadata: order.principal.metadata
                  }
                : undefined
            "
            mode="amount-then-ticker"
            class="w-full text-right"
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
