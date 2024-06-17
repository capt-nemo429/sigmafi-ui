import { ValidationRuleWithParams } from "@vuelidate/core";
import { BigNumber } from "bignumber.js";
import { isRef, Ref } from "vue";

function valOf<T>(val: T | Ref<T>) {
  return isRef(val) ? val.value : val;
}

function maxValidator(max: string | Ref<string>) {
  return (value?: string) => {
    if (!value) return true;
    return BigNumber(valOf(max)).gte(value);
  };
}

function minValidator(min: string | Ref<string>) {
  return (value?: string) => {
    if (!value) return true;
    return BigNumber(valOf(min)).lte(value);
  };
}

function greaterThanValidator(min: string | Ref<string>) {
  return (value?: string) => {
    if (!value) return true;
    return BigNumber(valOf(min)).lt(value);
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

export function greaterThanValue(
  gt: string | Ref<string>
): ValidationRuleWithParams<{ gt: string }, string> {
  return {
    $validator: greaterThanValidator(gt),
    $message: ({ $params }) => `The amount should be greater than ${$params.gt}.`,
    $params: { gt: valOf(gt) }
  };
}
