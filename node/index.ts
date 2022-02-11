// node/index.ts
import {
  LRUCache,
  Service,
  ServiceContext,
  ParamsContext,
  RecorderState,
  method,
} from "@vtex/api";
import { Clients } from "./clients";
import { analytics } from "./handlers/analytics";
import { updateLiveUsers } from "./event/liveUsersUpdate";

import { productList } from "./resolvers/products";

// Create a LRU memory cache for the Status client.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
const memoryCache = new LRUCache<string, any>({ max: 5000 });
metrics.trackCache("status", memoryCache);

const TREE_SECONDS_MS = 3 * 1000;
const CONCURRENCY = 10;

declare global {
  type Context = ServiceContext<Clients, State>;

  interface State extends RecorderState {
    code: number;
  }
}

export default new Service<Clients, State, ParamsContext>({
  clients: {
    implementation: Clients,
    options: {
      default: {
        retries: 2,
        timeout: 10000,
      },
      //declaration to refer to what the app is supposed to do when listening to the event
      events: {
        exponentialTimeoutCoefficient: 2,
        exponentialBackoffCoefficient: 2,
        initialBackoffDelay: 50,
        retries: 1,
        timeout: TREE_SECONDS_MS,
        concurrency: CONCURRENCY,
      },
    },
  },
  routes: {
    analytics: method({
      GET: [analytics],
    }),
  },

  //call fn updateLiveUsers when receiving an event
  events: {
    liveUsersUpdate: updateLiveUsers,
  },
  graphql: {
    resolvers: {
      Query: {
        productList,
      },
    },
  },
});