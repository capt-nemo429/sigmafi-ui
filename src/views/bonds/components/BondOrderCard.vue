<script setup lang="ts">
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { useWalletStore } from "@/stories/walletStore";
import { formatBigNumber, getNetworkType, shortenString, showToast } from "@/utils";
import { Box, decimalize, isDefined, Network } from "@fleet-sdk/common";
import { ErgoAddress, SAFE_MIN_BOX_VALUE, SParse } from "@fleet-sdk/core";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import BigNumber from "bignumber.js";
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { TransactionFactory } from "@/offchain/transactionFactory";
import TxIdNotification from "@/components/TxIdNotification.vue";

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

  const collateral = props.box.assets.map((token) => ({
    tokenId: token.tokenId,
    amount: token.amount,
    metadata: wallet.metadata[token.tokenId]
  }));

  if (BigInt(props.box.value) > SAFE_MIN_BOX_VALUE) {
    collateral.unshift({
      tokenId: ERG_TOKEN_ID,
      amount: props.box.value,
      metadata: { decimals: ERG_DECIMALS, name: "ERG" }
    });
  }

  const interest = new BigNumber(parseOr(props.box.additionalRegisters.R6, "0"))
    .minus(parseOr(props.box.additionalRegisters.R5, "0"))
    .dividedBy(parseOr(props.box.additionalRegisters.R5, "0"))
    .multipliedBy(100)
    .decimalPlaces(3);

  const apr = interest
    .dividedBy((parseOr(props.box.additionalRegisters.R7, 0) * 2) / 60 / 24)
    .multipliedBy(365)
    .decimalPlaces(3);

  let borrowerAddress: string | undefined;
  if (props.box.additionalRegisters.R4) {
    borrowerAddress = ErgoAddress.fromPublicKey(
      props.box.additionalRegisters.R4.substring(4)
    ).encode(getNetworkType());
  }

  return {
    amount: decimalizeDefault(parseOr(props.box.additionalRegisters.R5, "0"), ERG_DECIMALS),
    term: blockToTime(parseOr(props.box.additionalRegisters.R7, 0)),
    collateral,
    interest: formatBigNumber(interest, 3),
    apr: formatBigNumber(apr, 3),
    cancellable: borrowerAddress ? wallet.usedAddresses.includes(borrowerAddress) : false
  };
});

function blockToTime(blocks: number) {
  const term = { interval: "", value: blocks * 2 };

  if (term.value > 59) {
    term.value /= 60;
    term.interval = pluralize("hour", term.value);

    if (term.value > 23) {
      term.value /= 24;
      term.interval = pluralize("day", term.value);

      if (term.value > 29) {
        term.value /= 30;
        term.interval = pluralize("month", term.value);
      }
    }
  } else {
    term.interval = pluralize("minute", term.value);
  }

  return term;
}

function pluralize(word: string, val: number) {
  if (val <= 1) {
    return word;
  }

  return word + "s";
}

function decimalizeDefault(val: string, decimals: number) {
  return decimalize(val, { decimals, thousandMark: "," });
}

function parseOr<T>(value: string | undefined, or: T) {
  return value ? SParse<T>(value) : or;
}

async function cancelOrder() {
  if (!props.box) {
    return;
  }

  try {
    cancelling.value = true;
    const txId = await TransactionFactory.cancelOrder(toRaw(props.box));

    const { oruga } = useProgrammatic();
    oruga.notification.open({
      duration: 5000,
      component: TxIdNotification,
      props: { txId }
    });

    cancelling.value = false;
  } catch (e: any) {
    console.error(e);
    cancelling.value = false;

    let message = "Unknown error.";
    if (e instanceof Error) {
      message = e.message;
    } else if (isDefined(e.info)) {
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
      <div class="stat-title skeleton-placeholder">
        {{ order?.term.value }} {{ order?.term.interval }} loan
      </div>
      <div class="stat-value text-success flex items-center gap-1">
        <div class="flex-grow">
          <div class="skeleton-placeholder">{{ order?.amount }} <small>ERG</small></div>
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
      <div class="stat-value skeleton-placeholder">{{ order?.interest }}%</div>
      <div class="stat-desc skeleton-placeholder">{{ order?.apr }}% APR</div>
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
          class="btn btn-sm btn-primary flex-grow"
          :disabled="!wallet.connected || loadingBox"
        >
          Borrow
        </button>
      </div>
    </div>
  </div>
</template>
