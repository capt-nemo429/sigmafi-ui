<script setup lang="ts">
import AssetInput from "@/components/AssetInput.vue";
import CleaveInput from "@/components/CleaveInput.vue";
import { useWalletStore } from "@/stories/walletStore";
import { computed, reactive, ref, toRaw } from "vue";
import { ERG_DECIMALS, ERG_TOKEN_ID } from "@/constants";
import { decimalize, first, isEmpty, TokenAmount } from "@fleet-sdk/common";
import { BigNumber } from "bignumber.js";
import { formatBigNumber, sendTransaction, shortenString, undecimalizeBigNumber } from "@/utils";
import SigDropdown from "@/components/SigDropdown.vue";
import AssetIcon from "@/components/AssetIcon.vue";
import { differenceBy, remove } from "lodash-es";
import { AssetInfo } from "@/types";
import { helpers, required } from "@vuelidate/validators";
import { minValue } from "@/validators/bigNumbers";
import useVuelidate from "@vuelidate/core";
import { TransactionFactory } from "@/offchain/transactionFactory";
import { VERIFIED_ASSETS } from "@/maps";

const wallet = useWalletStore();
const emit = defineEmits(["close"]);

type CollateralAsset = TokenAmount<string> & {
  info: AssetInfo<bigint>;
};

const loading = ref(false);
const state = reactive({
  loan: {
    amount: "",
    asset: first(VERIFIED_ASSETS)
  },
  term: {
    value: "",
    interval: "days" as "hours" | "days" | "months"
  },
  collateral: [] as CollateralAsset[],
  interest: ""
});

const unselectedAssets = computed(() => {
  if (isEmpty(state.collateral)) {
    return wallet.balance;
  }

  return differenceBy(wallet.balance, state.collateral, (x) => x.tokenId);
});

const blocks = computed(() => {
  let minutes = 0;
  const val = Number(state.term.value);

  switch (state.term.interval) {
    case "hours":
      minutes = val * 60;
      break;
    case "days":
      minutes = val * 24 * 60;
      break;
    case "months":
      minutes = val * 30 * 24 * 60;
      break;
  }

  return minutes / 2;
});

const interestAmount = computed(() => {
  if (
    !state.loan.amount ||
    state.loan.amount === "0" ||
    !state.interest ||
    state.interest === "0"
  ) {
    return new BigNumber(0);
  }

  return BigNumber(state.interest).div(100).multipliedBy(state.loan.amount);
});

const rules = {
  loan: {
    amount: {
      required,
      minValue: minValue("0.1")
    }
  },
  collateral: {
    required: helpers.withMessage("At least one asset should be added as collateral.", required)
  },
  term: {
    value: {
      required,
      minValue: minValue("1")
    },
    interval: {
      required
    }
  },
  interest: {
    required
  }
};

const $v = useVuelidate(rules, state, { $lazy: true });

function addCollateral(asset: AssetInfo<bigint>) {
  $v.value.collateral.$touch();
  state.collateral.push({ tokenId: asset.tokenId, amount: "", info: asset });
}

function removeCollateral(asset: AssetInfo<bigint>) {
  $v.value.collateral.$touch();
  remove(state.collateral, (x) => x.tokenId === asset.tokenId);
}

async function submit() {
  const isValid = await $v.value.$validate();
  if (!isValid || loading.value) {
    return;
  }

  // lend
  const loan = undecimalizeBigNumber(
    new BigNumber(state.loan.amount),
    state.loan.asset.metadata.decimals || 0
  );
  const repayment = undecimalizeBigNumber(
    interestAmount.value,
    state.loan.asset.metadata.decimals || 0
  ).plus(loan);

  // collateral
  let tokensCollateral: TokenAmount<string>[] = state.collateral.map((token) => ({
    tokenId: token.tokenId,
    amount: undecimalizeBigNumber(
      new BigNumber(token.amount),
      token.info.metadata?.decimals || 0
    ).toString()
  }));

  const ergCollateral = tokensCollateral.find((x) => x.tokenId === ERG_TOKEN_ID);
  if (ergCollateral) {
    tokensCollateral = tokensCollateral.filter((x) => x.tokenId != ERG_TOKEN_ID);
  }

  const sent = await sendTransaction(async () => {
    return await TransactionFactory.openOrder({
      type: "on-close",
      loan: {
        amount: loan.toString(),
        repayment: repayment.toString(),
        tokenId: state.loan.asset.tokenId
      },
      maturityLength: blocks.value,
      collateral: {
        nanoErgs: ergCollateral?.amount,
        tokens: tokensCollateral
      }
    });
  }, loading);

  if (sent) {
    emit("close");
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6">
    <h3 class="font-semibold text-xl">New loan request</h3>
    <div>
      <div class="form-control">
        <label class="label">
          <span class="label-text big">Amount</span>
        </label>
        <div class="input-group">
          <cleave-input
            v-model="state.loan.amount"
            @blur="$v.loan.$touch()"
            :readonly="loading"
            :options="{
              numeral: true,
              numeralPositiveOnly: true,
              numeralDecimalScale: state.loan.asset.metadata.decimals || 0
            }"
            placeholder="0.00"
            class="input input-bordered w-full input-lg"
          />
          <select v-model="state.loan.asset" class="select select-bordered select-lg border-l-0">
            <option v-for="asset in VERIFIED_ASSETS" :key="asset.tokenId" :value="asset">
              {{ asset.metadata.name }}
            </option>
          </select>
        </div>
        <label class="label !pt-1" v-if="$v.loan.$error">
          <span class="label-text-alt text-error"> {{ $v.loan.$errors[0].$message }}</span>
        </label>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Term</span>
            <span class="label-text-alt opacity-70" v-if="blocks > 0n"
              >{{ decimalize(blocks.toString(), { decimals: 0, thousandMark: "," }) }} blocks</span
            >
          </label>
          <div class="input-group">
            <cleave-input
              v-model="state.term.value"
              @blur="$v.term.$touch()"
              :readonly="loading"
              :options="{
                blocks: [5],
                numericOnly: true
              }"
              placeholder="0"
              class="input input-bordered w-full"
            />
            <select
              @blur="$v.term.$touch()"
              v-model="state.term.interval"
              class="select select-bordered border-l-0"
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
          <label class="label !pt-1" v-if="$v.term.$error">
            <span class="label-text-alt text-error"> {{ $v.term.$errors[0].$message }}</span>
          </label>
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Interest</span>
            <span class="label-text-alt opacity-70" v-if="interestAmount.gt(0)"
              >{{
                formatBigNumber(interestAmount, state.loan.asset.metadata.decimals || 0, false)
              }}
              {{ state.loan.asset.metadata.name }}</span
            >
          </label>
          <div class="input-group">
            <cleave-input
              v-model="state.interest"
              @blur="$v.interest.$touch()"
              :readonly="loading"
              :options="{
                numeral: true,
                numeralPositiveOnly: true,
                numeralDecimalScale: 3
              }"
              placeholder="0.00"
              class="input input-bordered w-full"
            />
            <span class="!border-l-0">%</span>
          </div>
          <label class="label !pt-1" v-if="$v.interest.$error">
            <span class="label-text-alt text-error"> {{ $v.interest.$errors[0].$message }}</span>
          </label>
        </div>
      </div>
    </div>

    <div>
      <div class="form-control">
        <label class="label">
          <span class="label-text big">Collateral</span>
        </label>
        <asset-input
          v-for="asset in state.collateral"
          v-model="asset.amount"
          @remove="removeCollateral"
          :readonly="loading"
          :key="asset.tokenId"
          :asset="asset.info"
          :disposable="true"
          class="pb-2"
        />
      </div>
      <sig-dropdown root-class="w-full" menu-class="w-full">
        <button :disabled="loading" class="btn w-full shadow mt-2">Add collateral</button>
        <template v-slot:menu>
          <li v-for="asset in unselectedAssets">
            <a @click="addCollateral(asset)" class="flex flex-row" :key="asset.tokenId">
              <asset-icon
                class="h-10 w-10"
                :token-id="asset.tokenId"
                :type="asset.metadata?.type"
              />
              <span class="flex-grow">{{
                shortenString(asset.metadata?.name || asset.tokenId, 20)
              }}</span>
              <span>
                {{
                  decimalize(asset.amount, {
                    decimals: asset.metadata?.decimals || 0,
                    thousandMark: ","
                  })
                }}
              </span>
            </a>
          </li>
        </template>
      </sig-dropdown>
      <label class="label !pt-1" v-if="$v.collateral.$error">
        <span class="label-text-alt text-error"> {{ $v.collateral.$errors[0].$message }}</span>
      </label>
    </div>

    <div class="modal-action">
      <button class="btn btn-ghost" :disabled="loading" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :class="{ loading: loading }" @click="submit()">
        Confirm
      </button>
    </div>
  </div>
</template>
