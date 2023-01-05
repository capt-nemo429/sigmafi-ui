import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import BondsMarketView from "./views/bonds/BondsMarketView.vue";
import Dashboard from "./views/Dashboard.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: BondsMarketView },
  { path: "/dashboard/", name: "dashboard", component: Dashboard }
];

export const router = createRouter({
  history: createWebHistory("sigmafi-ui"),
  routes
});
