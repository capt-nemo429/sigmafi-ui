<script setup lang="ts">
import { useDefaultStore } from "@/stories/defaultStore";
import { useWalletStore } from "@/stories/walletStore";
import { shortenString } from "@/utils";
import { decimalize } from "@fleet-sdk/common";
import { computed } from "vue";
import { MoonIcon, SunIcon } from "@zhuowenli/vue-feather-icons";
import { ERG_DECIMALS } from "@/constants";

const defaultStore = useDefaultStore();
const wallet = useWalletStore();

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
        <a class="btn btn-ghost normal-case text-xl gap-2"
          >SigmaFi <span class="badge badge-outline font-normal">testnet</span></a
        >

        <!-- <ul class="menu menu-horizontal px-1">
          <li>
            <a>Market</a>
          </li>
          <li>
            <a>Dashboard</a>
          </li>
        </ul> -->
      </div>

      <div class="flex-1r"></div>

      <div class="flex-2">
        <ul class="menu menu-horizontal px-1 gap-2">
          <li></li>
          <li>
            <a
              class="btn btn-ghost gap-1 bg-base-100 bg-opacity-60 no-animation h-2"
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
