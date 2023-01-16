<script setup lang="ts">
import { formatBigNumber, shortenString } from "@/utils";
import { decimalize } from "@fleet-sdk/common";
import { computed, PropType, ref } from "vue";
import { HTMLCleaveElement, AssetInfo } from "@/types";
import CleaveInput from "./CleaveInput.vue";
import { TrashIcon } from "@zhuowenli/vue-feather-icons";
import { BigNumber } from "bignumber.js";
import { useVuelidate } from "@vuelidate/core";
import { required } from "@vuelidate/validators";
import { maxValue, minValue } from "@/validators/bigNumbers";
import AssetIcon from "./AssetIcon.vue";

// emits
const emit = defineEmits(["update:modelValue", "remove"]);

// props
const props = defineProps({
  placeholder: String,
  readonly: Boolean,
  disposable: Boolean,
  asset: { type: Object as PropType<AssetInfo<bigint>>, required: true },
  modelValue: { type: String, required: true }!
});

// refs
const input = ref<HTMLCleaveElement>();
const hovered = ref(false);

// computed
const total = computed(() => {
  const decimals = props.asset.metadata?.decimals;
  return decimalize(props.asset.amount, decimals);
});

const value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  }
});

const converted = computed(() => {
  if (!props.asset.conversion) {
    return;
  }

  return formatBigNumber(
    new BigNumber(props.asset.conversion.rate).multipliedBy(value.value || 0),
    3,
    false
  );
});

// methods
function focus() {
  input.value?.focus();
}

function setMax() {
  if (props.readonly) {
    return;
  }

  value.value = total.value;
}

function emitRemove() {
  emit("remove", props.asset);
}

// validations
const rules = {
  val: {
    required,
    maxValue: maxValue(total),
    minValue: minValue("0")
  }
};

const $v = useVuelidate(rules, { val: value });
</script>

<template>
  <div
    class="form-control"
    @click.prevent.stop="focus()"
    @mouseover="hovered = true"
    @mouseout="hovered = false"
  >
    <div class="asset-input relative" tabindex="0" @focus="focus()">
      <button
        v-if="disposable && !readonly"
        v-show="hovered"
        @click.prevent.stop="emitRemove()"
        tabindex="-1"
        class="btn btn-circle btn-sm inline-flex -top-3 -right-3.5 absolute"
      >
        <trash-icon class="w-3.5 h-3.5" />
      </button>
      <div class="flex flex-row gap-2 text-base">
        <div class="flex-grow">
          <cleave-input
            v-model="value"
            @blur="$v.$touch()"
            :readonly="readonly"
            :placeholder="placeholder || (asset.metadata?.decimals ? '0.00' : '0')"
            :options="{
              numeral: true,
              numeralPositiveOnly: true,
              numeralDecimalScale: asset.metadata?.decimals || 0
            }"
            ref="input"
            class="w-full outline-none"
          />
        </div>
        <div class="flex flex-row text-right items-center gap-1 whitespace-nowrap">
          <asset-icon class="h-5 w-5" :token-id="asset.tokenId" :type="asset.metadata?.type" />
          <span class="flex-grow text-sm" v-if="asset.metadata?.name">
            {{ shortenString(asset.metadata.name, 15) }}
          </span>
          <span class="flex-grow" v-else>{{ shortenString(asset.tokenId, 10) }}</span>
        </div>
      </div>
      <div class="flex flex-row gap-2 mt-1 text-base-content text-opacity-50 text-xs">
        <div class="flex-grow">
          <span v-if="asset.conversion">≈ {{ converted }} {{ asset.conversion.currency }}</span>
          <span v-else>No conversion rate</span>
        </div>
        <div class="flex-grow text-right">
          <a @click="setMax()" class="cursor-pointer underline-transparent"
            >Balance:
            {{
              decimalize(asset.amount, {
                decimals: asset.metadata?.decimals || 0,
                thousandMark: ","
              })
            }}</a
          >
        </div>
      </div>
    </div>
    <label class="label !pt-2" v-if="$v.$error">
      <span class="label-text-alt text-error"> {{ $v.$errors[0].$message }}</span>
    </label>
  </div>
</template>
