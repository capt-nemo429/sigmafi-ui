import { Client, createClient, gql } from "@urql/core";
import { Box as GraphQLBox, Token } from "@ergo-graphql/types";
import { chunk, Box, NonMandatoryRegisters, Network } from "@fleet-sdk/common";
import { getNetworkType } from "@/utils";

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

  public async getBoxes(
    ergoTrees: string[],
    spent = false,
    take = 20,
    skip = 0
  ): Promise<Box<string>[]> {
    const query = gql<
      { boxes: GraphQLBox[] },
      { ergoTrees: string[]; spent: boolean; skip: number; take: number }
    >`
      query Boxes($ergoTrees: [String!], $skip: Int, $take: Int, $spent: Boolean) {
        boxes(ergoTrees: $ergoTrees, skip: $skip, take: $take, spent: $spent) {
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

    const response = await this._client.query(query, { ergoTrees, spent, skip, take }).toPromise();
    return (
      response.data?.boxes.map((box) => ({
        ...box,
        additionalRegisters: box.additionalRegisters as NonMandatoryRegisters
      })) || []
    );
  }
}

export const graphQLService = new GraphQLService();
