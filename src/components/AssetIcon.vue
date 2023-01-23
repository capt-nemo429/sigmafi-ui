<script setup lang="ts">
import { isDefined } from "@fleet-sdk/common";
import { computed } from "vue";
import EmptyIcon from "@/assets/icons/asset-empty.svg";
import AudioNftIcon from "@/assets/icons/asset-nft-audio.svg";
import PictureNftIcon from "@/assets/icons/asset-nft-picture.svg";
import VideoNftIcon from "@/assets/icons/asset-nft-video.svg";
import { ASSET_ICONS } from "@/maps/assetIcons";
import { AssetType } from "@/types";

// props
const props = defineProps({
  tokenId: { type: String, required: true },
  customClass: { type: String, default: "" },
  type: { type: String, default: undefined }
});

// computed
const logo = computed(() => {
  const logoFile = ASSET_ICONS[props.tokenId];
  if (logoFile) {
    return `./asset-icons/${logoFile}`;
  }

  return undefined;
});

const hasLogo = computed(() => isDefined(logo.value));
const isPictureNft = computed(() => props.type === AssetType.PictureArtwork);
const isAudioNft = computed(() => props.type === AssetType.AudioArtwork);
const isVideoNft = computed(() => props.type === AssetType.VideoArtwork);
const color = computed(() => calculateColor(props.tokenId));

function calculateColor(tokenId: string) {
  if (tokenId.length < 6) {
    return;
  }

  return `#${tokenId.substring(0, 6)}`;
}
</script>

<template>
  <img v-if="hasLogo" :src="logo" :class="customClass" />
  <template v-else>
    <picture-nft-icon
      v-if="isPictureNft"
      :class="customClass"
      class="fill-gray-300"
      :style="`fill: ${color}`"
    />
    <audio-nft-icon
      v-else-if="isAudioNft"
      :class="customClass"
      class="fill-gray-300"
      :style="`fill: ${color}`"
    />
    <video-nft-icon
      v-else-if="isVideoNft"
      :class="customClass"
      class="fill-gray-300"
      :style="`fill: ${color}`"
    />
    <empty-icon
      v-else
      :class="customClass"
      class="fill-gray-400 opacity-60"
      :style="`fill: ${color}`"
    />
  </template>
</template>
