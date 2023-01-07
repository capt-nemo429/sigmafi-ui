<script setup lang="ts">
import { useUIStore } from "@/stories/uiStore";
import { useWalletStore } from "@/stories/walletStore";
import { getNetworkType, shortenString } from "@/utils";
import { decimalize, Network } from "@fleet-sdk/common";
import { computed } from "vue";
import { MoonIcon, SunIcon } from "@zhuowenli/vue-feather-icons";
import { ERG_DECIMALS } from "@/constants";

const defaultStore = useUIStore();
const wallet = useWalletStore();
const isTestnet = getNetworkType() === Network.Testnet;

const ergBalance = computed(() => {
  const balance = wallet.balance.find((x) => x.tokenId === "ERG")?.amount || "0";

  return decimalize(balance, { decimals: ERG_DECIMALS, thousandMark: "," });
});
</script>

<template>
  <div
    class="sticky top-0 z-30 flex h-16 w-full justify-center bg-opacity-50 backdrop-blur transition-all duration-100 bg-base-100 text-base-content shadow-sm"
  >
    <div class="navbar w-full px-4 flex">
      <div class="flex-1 gap-2">
        <router-link to="/" class="btn btn-ghost normal-case text-xl gap-2"
          >SigmaFi
          <span v-if="isTestnet" class="badge badge-outline font-normal">testnet</span></router-link
        >
        <ul class="menu menu-horizontal px-1 gap-2">
          <li>
            <router-link to="/" active-class="active-item">Market</router-link>
          </li>
          <li>
            <router-link to="/dashboard" v-if="wallet.connected" active-class="active-item"
              >Dashboard</router-link
            >
          </li>
        </ul>
      </div>

      <div class="flex-1r"></div>

      <div class="flex-2">
        <ul class="menu menu-horizontal px-1 gap-2">
          <li></li>
          <li>
            <a
              class="btn btn-ghost gap-1 bg-base-100 hover:bg-base-100 hover:bg-opacity-50 bg-opacity-50 no-animation h-2"
              :class="{ loading: wallet.loading }"
              @click="wallet.connect()"
            >
              <template v-if="!wallet.connected">Connect Wallet</template>
              <template v-else>
                <span class="font-normal">{{ ergBalance }} ERG</span>
                <span class="normal-case py-1 px-2 font-normal opacity-70">
                  {{ shortenString(wallet.changeAddress, 14) }}
                </span>
                <img src="/nautilus.svg" width="24" height="24" />
              </template>
            </a>
            <ul class="p-2 bg-base-100 shadow-md w-full" v-if="wallet.connected">
              <li><a @click="wallet.disconnect()">Disconnect</a></li>
            </ul>
          </li>
          <li>
            <a class="btn btn-ghost" @click="defaultStore.toggleTheme()">
              <sun-icon v-if="defaultStore.theme.value === 'light'" />
              <moon-icon v-else />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-item {
  @apply bg-base-100 bg-opacity-50;
}

.menu a {
  @apply active:bg-base-100 active:text-base-content;
}
</style>
