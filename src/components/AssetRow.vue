<script setup lang="ts">
import { ERG_TOKEN_ID } from "@/constants";
import { AssetInfo } from "@/types";
import { formatBigNumber, shortenString, tokenUrlFor } from "@/utils";
import BigNumber from "bignumber.js";
import { PropType } from "vue";
import SigTooltip from "./SigTooltip.vue";
import { verifiedToken } from "@/utils";
import { AlertTriangleIcon } from "@zhuowenli/vue-feather-icons";

defineProps({
  asset: Object as PropType<Readonly<AssetInfo<BigNumber>>>,
  rootClass: String,
  nameClass: String,
  amountClass: String,
  badgeClass: String,
  maxNameLen: Number,
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
