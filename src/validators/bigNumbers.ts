import { BigNumber } from "bignumber.js";
import { ValidationRuleWithParams } from "@vuelidate/core";
import { Ref, isRef } from "vue";

function valOf<T>(val: T | Ref<T>) {
  return isRef(val) ? val.value : val;
}

function maxValidator(max: string | Ref<string>) {
  return (value?: string) => {
    if (!value) {
      return true;
    }

    return new BigNumber(valOf(max)).isGreaterThanOrEqualTo(value);
  };
}

function minValidator(min: string | Ref<string>) {
  return (value?: string) => {
    if (!value) {
      return true;
    }

    return new BigNumber(valOf(min)).isLessThanOrEqualTo(value.toString());
  };
}

export function maxValue(
  max: string | Ref<string>
): ValidationRuleWithParams<{ max: string }, string> {
  return {
    $validator: maxValidator(max),
    $message: ({ $params }) => `The amount should be less than or equal to ${$params.max}.`,
    $params: { max: valOf(max) }
  };
}

export function minValue(
  min: string | Ref<string>
): ValidationRuleWithParams<{ min: string }, string> {
  return {
    $validator: minValidator(min),
    $message: ({ $params }) => `The amount should be greater than or equal to  ${$params.min}.`,
    $params: { min: valOf(min) }
  };
}
