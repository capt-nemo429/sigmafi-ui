<script setup lang="ts">
import { AlertTriangleIcon } from "@zhuowenli/vue-feather-icons";
import BigNumber from "bignumber.js";
import { PropType } from "vue";
import SigTooltip from "./SigTooltip.vue";
import { ERG_TOKEN_ID } from "@/constants";
import { AssetInfo } from "@/types";
import { formatBigNumber, shortenString, tokenUrlFor } from "@/utils";
import { verifiedToken } from "@/utils";

defineProps({
  asset: { type: Object as PropType<Readonly<AssetInfo<BigNumber>>>, default: undefined },
  rootClass: { type: String, default: "" },
  nameClass: { type: String, default: "" },
  amountClass: { type: String, default: "" },
  badgeClass: { type: String, default: "" },
  maxNameLen: { type: Number, default: undefined },
  showBadge: Boolean,
  link: Boolean
});
</script>

<template>
  <div :class="rootClass" class="flex gap-1">
    <template v-if="asset">
      <div :class="amountClass">{{ formatBigNumber(asset.amount, asset.metadata?.decimals) }}</div>
      <div :class="nameClass" class="flex items-center gap-2">
        <a
          v-if="link && asset.tokenId !== ERG_TOKEN_ID"
          class="link link-hover"
          :class="nameClass"
          :href="tokenUrlFor(asset.tokenId)"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ shortenString(asset.metadata?.name || asset.tokenId, maxNameLen) }}
        </a>
        <div v-else :class="nameClass">
          {{ shortenString(asset.metadata?.name || asset.tokenId, maxNameLen) }}
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
</template>
