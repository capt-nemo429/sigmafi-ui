<script setup lang="ts">
import { isEmpty } from "@fleet-sdk/common";
import { ExternalLinkIcon, InfoIcon } from "@zhuowenli/vue-feather-icons";
import { computed, PropType, ref, toRaw } from "vue";
import AssetIcon from "@/components/AssetIcon.vue";
import AssetRow from "@/components/AssetRow.vue";
import BondRatioBadge from "@/components/BondRatioBadge.vue";
import SigTooltip from "@/components/SigTooltip.vue";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { useWalletStore } from "@/stories/walletStore";
import { AssetType } from "@/types";
import { addressUrlFor, shortenString } from "@/utils";
import { formatBigNumber, Order, sendTransaction } from "@/utils";
import { ERG_TOKEN_ID, MIN_FEE } from "@/constants";

const IPFS_PROTOCOL_PREFIX = "ipfs://";
const IPFS_GENERAL_GATEWAY = "https://cloudflare-ipfs.com/ipfs/";

const wallet = useWalletStore();

const props = defineProps({
  order: { type: Object as PropType<Order>, required: false, default: undefined },
  loadingBox: { type: Boolean, default: false },
  loadingMetadata: { type: Boolean, default: false }
});

const cancelling = ref(false);
const closing = ref(false);

function resolveIpfs(url?: string): string {
  if (!url) {
    return "";
  }

  if (!url.startsWith(IPFS_PROTOCOL_PREFIX)) {
    return url;
  } else {
    return url.replace(IPFS_PROTOCOL_PREFIX, IPFS_GENERAL_GATEWAY);
  }
}

const nftBackgroundUrl = computed(() => {
  const nfts = props.order?.collateral.filter(
    (x) => x.metadata?.type === AssetType.PictureArtwork && !!x.metadata?.url
  );

  if (isEmpty(nfts)) return;
  const fileUrl = nfts[nfts.length > 1 ? randMax(nfts.length) : 0].metadata?.url;
  return resolveIpfs(fileUrl);
});

const closable = computed(() => {
  if (props.loadingBox || !wallet.connected || !props.order || isEmpty(wallet.balance)) {
    return false;
  }

  const { principal } = props.order;
  const principalBalance = wallet.balance.find((x) => x.tokenId === principal.tokenId);
  if (!principalBalance) return false;

  return props.order.principal.amount.lte(
    String(
      principalBalance.tokenId === ERG_TOKEN_ID
        ? principalBalance.amount - MIN_FEE
        : principalBalance.amount
    )
  );
});

const interest = computed(() => {
  if (!props.order?.interest) return "";
  const { interest } = props.order;

  const amount = formatBigNumber(interest?.amount, interest?.metadata?.decimals);
  const name = shortenString(interest?.metadata?.name || interest?.tokenId, 10);
  return `${amount} ${name}`;
});

const fees = computed(() => {
  if (!props.order) return "";
  const { principal, fees } = props.order;

  const amount = formatBigNumber(fees.contract.plus(fees.ui), principal?.metadata?.decimals);
  const name = shortenString(principal?.metadata?.name || principal?.tokenId, 10);
  return `${amount} ${name}`;
});

const blocks = computed(() => {
  if (!props.order) return "";
  return `${props.order.term.blocks.toLocaleString()} blocks`;
});

function randMax(max: number): number {
  return Math.floor(Math.random() * max);
}

async function cancelOrder() {
  const box = props.order?.box;
  if (!box) return;

  await sendTransaction(async () => {
    return await TransactionFactory.cancelOrder(toRaw(box));
  }, cancelling);
}

async function closeOrder() {
  const box = props.order?.box;
  if (!box) return;

  await sendTransaction(async () => {
    return await TransactionFactory.closeOrder(toRaw(box));
  }, closing);
}
</script>

<template>
  <div
    class="stats flex flex-col bg-base-100 stats-vertical shadow-xl relative"
    :class="{ skeleton: loadingBox }"
  >
    <img
      v-if="nftBackgroundUrl"
      :src="nftBackgroundUrl"
      class="h-full absolute opacity-20 object-cover z-0 dark:opacity-10"
    />
    <div class="stat">
      <div class="flex justify-between align-middle">
        <div>
          <div class="stat-title skeleton-placeholder">Loan request</div>
          <div class="stat-value text-success flex items-center gap-1">
            <div class="flex-grow">
              <asset-row
                mode="amount-then-ticker"
                :max-name-len="15"
                :asset="order?.principal"
                root-class="items-baseline"
                name-class="text-sm"
                hide-price
              />
            </div>
          </div>
        </div>

        <div v-if="loadingBox || !order" class="skeleton-fixed h-12 w-12 skeleton-circular"></div>
        <asset-icon v-else custom-class="h-12 w-12" :token-id="order.principal.tokenId" />
      </div>
    </div>

    <div class="stat">
      <div class="h-fit flex justify-between items-center">
        <span class="stat-title">Collateral</span>
        <bond-ratio-badge :ratio="order?.ratio" />
      </div>

      <div class="grid grid-cols-1 gap-2 mt-2 items-start">
        <div v-if="loadingBox" class="flex flex-row items-center gap-2">
          <div class="skeleton-fixed h-8 w-8 py-3 skeleton-circular"></div>
          <div class="flex-grow skeleton-fixed h-5"></div>
          <div class="skeleton-fixed h-5 w-1/3"></div>
        </div>
        <div v-for="collateral in order?.collateral" v-else :key="collateral.tokenId">
          <div class="flex flex-row items-center gap-2" :class="{ skeleton: loadingMetadata }">
            <asset-icon
              custom-class="h-8 w-8 min-w-8 min-h-8"
              :token-id="collateral.tokenId"
              :type="collateral.metadata?.type"
            />
            <template v-if="loadingMetadata">
              <div class="flex-grow skeleton-fixed h-5"></div>
              <div class="skeleton-fixed h-5 w-1/3"></div>
            </template>
            <template v-else>
              <asset-row
                link
                show-badge
                mode="ticker-then-amount"
                :asset="collateral"
                :max-name-len="50"
                class="w-full"
                root-class="flex-row-reverse w-full items-center gap-2"
                amount-class="text-right"
                name-class="w-full"
                badge-class="w-5 h-5"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-grow opacity-0"></div>

    <div class="stat">
      <div class="flex justify-between">
        <div class="flex-grow">
          <div class="stat-title skeleton-placeholder">Term</div>
          <div class="stat-value skeleton-placeholder flex-grow">
            {{ order?.term.value }} {{ order?.term.interval }}
            <sig-tooltip :tip="blocks">
              <info-icon />
            </sig-tooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="stat">
      <div class="flex gap-2 justify-between">
        <div>
          <div class="stat-title">Interest</div>
          <div class="stat-value skeleton-placeholder">
            {{ order?.interest?.percent }}%
            <sig-tooltip :tip="interest">
              <info-icon />
            </sig-tooltip>
          </div>
          <div class="stat-desc skeleton-placeholder">
            {{ formatBigNumber(order?.interest?.apr, 2) }}% APR
          </div>
        </div>

        <div>
          <div class="stat-title">Borrower</div>
          <a
            :href="addressUrlFor(order?.borrower)"
            class="link link-hover text-sm skeleton-placeholder"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ shortenString(order?.borrower, 10) }}
            <external-link-icon class="inline pb-1 p-0 m-0" />
          </a>
        </div>
      </div>
    </div>
    <div class="stat">
      <div class="stat-desc skeleton-placeholder text-center">Service Fee: {{ fees }}</div>

      <div class="stat-actions text-center flex gap-2">
        <button
          v-if="order?.cancellable"
          class="btn btn-sm btn-ghost"
          :class="{ loading: cancelling }"
          :disabled="!wallet.connected || loadingBox"
          @click="cancelOrder()"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm btn-outline flex-grow"
          :class="{ loading: closing || loadingBox }"
          :disabled="!closable"
          @click="closeOrder()"
        >
          <span v-if="closable">Lend</span>
          <span v-else-if="loadingBox">Loading</span>
          <span v-else-if="!wallet.connected">Wallet not connected</span>
          <span v-else>Insufficient funds</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat {
  @apply z-10;
}
</style>
