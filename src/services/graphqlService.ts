import { Client, createClient, gql } from "@urql/core";
import { Box as GraphQLBox, QueryBoxesArgs, Token } from "@ergo-graphql/types";
import { chunk, Box, NonMandatoryRegisters, Network, Amount, some } from "@fleet-sdk/common";
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

  public async *yeldTokensMetadata(tokenIds: string[]) {
    const query = gql<{ tokens: Token[] }, { tokenIds: string[] }>`
      query tokens($tokenIds: [String!]!) {
        tokens(tokenIds: $tokenIds) {
          tokenId
          name
          decimals
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
      query Boxes(
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
