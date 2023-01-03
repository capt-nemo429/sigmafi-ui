import App from "./App.vue";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { setSystemTheme } from "./utils";
import { Modal, Notification, Config } from "@oruga-ui/oruga-next";

import "@oruga-ui/oruga-next/dist/oruga.css";
import "./style.css";

setSystemTheme();

const orugaSettings = {
  modal: {
    trapFocus: true,
    overlayClass: "opacity-80",
    rootClass: "outline-none",
    contentClass: "modal-box"
  }
};

const pinia = createPinia();
const app = createApp(App);

app.use(pinia).use(Config, orugaSettings).use(Modal).use(Notification).mount("#app");
