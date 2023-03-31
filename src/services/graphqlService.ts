import {
  AddressBalance,
  Box as GraphQLBox,
  Header,
  QueryAddressesArgs,
  QueryBlockHeadersArgs,
  QueryBoxesArgs,
  Token
} from "@ergo-graphql/types";
import { Box, chunk, Network, NonMandatoryRegisters, some } from "@fleet-sdk/common";
import { Client, createClient, gql } from "@urql/core";
import { getNetworkType } from "@/utils/otherUtils";

class GraphQLService {
  private _client: Client;
  constructor() {
    this._client = createClient({
      url:
        getNetworkType() === Network.Mainnet
          ? "https://graphql.erg.zelcore.io/"
          : "https://tn-ergo-explorer.anetabtc.io/graphql",
      requestPolicy: "network-only"
    });
  }

  public async getCurrentHeight(): Promise<number | undefined> {
    const query = gql<{ blockHeaders: Header[] }, QueryBlockHeadersArgs>`
      query height {
        blockHeaders(take: 1) {
          height
        }
      }
    `;

    const response = await this._client.query(query, {}).toPromise();

    return response.data?.blockHeaders[0].height;
  }

  public async getBalance(addresses: string[]) {
    const query = gql<{ addresses: { balance: AddressBalance }[] }, QueryAddressesArgs>`
      query balances($addresses: [String!]!) {
        addresses(addresses: $addresses) {
          balance {
            nanoErgs
            assets {
              tokenId
              amount
              decimals
            }
          }
        }
      }
    `;

    const response = await this._client.query(query, { addresses }).toPromise();

    return response.data?.addresses.flatMap((x) => x.balance) || [];
  }

  public async *yeldTokensMetadata(tokenIds: string[]) {
    const query = gql<{ tokens: Token[] }, { tokenIds: string[] }>`
      query tokens($tokenIds: [String!]!) {
        tokens(tokenIds: $tokenIds) {
          tokenId
          name
          decimals
          box {
            additionalRegisters
          }
        }
      }
    `;

    const chunks = chunk(tokenIds, 20);
    for (const chunk of chunks) {
      const response = await this._client.query(query, { tokenIds: chunk }).toPromise();

      if (response.data?.tokens) {
        yield response.data.tokens;
      }
    }

    return [];
  }

  public async *yeldBoxes(args: QueryBoxesArgs) {
    const take = 50;

    let len = 0;
    let skip = 0;

    do {
      const chunk = await this.getBoxes({ ...args, take, skip });
      skip += take;
      len = chunk.length;

      if (some(chunk)) {
        yield chunk;
      }
    } while (len === take);
  }

  public async getBoxes(args: QueryBoxesArgs): Promise<Box<string>[]> {
    const query = gql<{ boxes: GraphQLBox[] }, QueryBoxesArgs>`
      query SigFiBoxes(
        $ergoTrees: [String!]
        $registers: Registers
        $spent: Boolean!
        $skip: Int
        $take: Int
      ) {
        boxes(
          ergoTrees: $ergoTrees
          registers: $registers
          spent: $spent
          skip: $skip
          take: $take
        ) {
          boxId
          transactionId
          value
          creationHeight
          index
          ergoTree
          additionalRegisters
          assets {
            tokenId
            amount
          }
        }
        mempool {
          size
        }
      }
    `;

    const response = await this._client.query(query, args).toPromise();

    return (
      response.data?.boxes.map((box) => ({
        ...box,
        additionalRegisters: box.additionalRegisters as NonMandatoryRegisters
      })) || []
    );
  }
}

export const graphQLService = new GraphQLService();
