<script setup lang="ts">
import { AlertTriangleIcon } from "@zhuowenli/vue-feather-icons";
import BigNumber from "bignumber.js";
import { computed, PropType } from "vue";
import AssetPrice from "./AssetPrice.vue";
import SigTooltip from "./SigTooltip.vue";
import { ERG_TOKEN_ID } from "@/constants";
import { AssetInfo } from "@/types";
import { formatBigNumber, shortenString, tokenUrlFor } from "@/utils";
import { verifiedToken } from "@/utils";

const props = defineProps({
  asset: { type: Object as PropType<Readonly<AssetInfo<BigNumber>>>, default: undefined },
  rootClass: { type: String, default: "" },
  nameClass: { type: String, default: "" },
  amountClass: { type: String, default: "" },
  badgeClass: { type: String, default: "" },
  maxNameLen: { type: Number, default: undefined },
  mode: {
    type: String as PropType<"ticker-then-amount" | "amount-then-ticker">,
    default: "ticker-then-amount"
  },
  hidePrice: Boolean,
  showBadge: Boolean,
  link: Boolean
});

const showPrice = computed(() => {
  return !props.hidePrice;
});
</script>

<template>
  <div class="flex flex-col">
    <div :class="rootClass" class="flex gap-1">
      <template v-if="asset">
        <div class="flex flex-col" :class="amountClass">
          {{ formatBigNumber(asset.amount, asset.metadata?.decimals) }}
          <asset-price v-if="mode === 'ticker-then-amount' && showPrice" :asset="asset" />
        </div>

        <div :class="nameClass" class="flex items-center gap-2 justify-start w-full">
          <a
            v-if="link && asset.tokenId !== ERG_TOKEN_ID"
            class="link link-hover break-all"
            :href="tokenUrlFor(asset.tokenId)"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{
              shortenString(
                asset.metadata?.name || asset.tokenId,
                asset.metadata?.name ? maxNameLen : 10
              )
            }}
          </a>
          <div v-else :class="nameClass" class="break-all">
            {{
              shortenString(
                asset.metadata?.name || asset.tokenId,
                asset.metadata?.name ? maxNameLen : 10
              )
            }}
          </div>
          <sig-tooltip
            v-if="showBadge === true && !verifiedToken(asset.tokenId)"
            tip="Unverified token"
          >
            <alert-triangle-icon :class="badgeClass" class="text-orange-400 dark:text-yellow-500" />
          </sig-tooltip>
        </div>
      </template>
      <template v-else>
        <div :class="amountClass" class="skeleton-fixed h-4 w-8/12"></div>
        <div :class="nameClass" class="skeleton-fixed h-4 w-8/12"></div>
      </template>
    </div>
    <asset-price v-if="mode === 'amount-then-ticker' && showPrice" :asset="asset" />
  </div>
</template>
