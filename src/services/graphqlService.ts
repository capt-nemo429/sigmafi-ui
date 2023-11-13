import {
  AddressBalance,
  QueryAddressesArgs as BalanceArgs,
  Box as GraphQLBox,
  Header,
  QueryBoxesArgs,
  Token,
  QueryTokensArgs as TokenArgs
} from "@ergo-graphql/types";
import { ErgoGraphQLProvider } from "@fleet-sdk/blockchain-providers";
import { Box, chunk, Network, NonMandatoryRegisters, some } from "@fleet-sdk/common";
import { getNetworkType } from "@/utils/otherUtils";

const BALANCE_QUERY = `query balances($addresses: [String!]!) { addresses(addresses: $addresses) { balance { nanoErgs assets { tokenId amount decimals } } } }`;
const HEIGHT_QUERY = `query height { blockHeaders(take: 1) { height } }`;
const TOKEN_METADATA_QUERY = `query tokens($tokenIds: [String!]!) { tokens(tokenIds: $tokenIds) { tokenId name decimals box { additionalRegisters } } }`;

type BalanceResponse = { addresses: { balance: AddressBalance }[] };
type HeightResponse = { blockHeaders: Header[] };
type TokenResponse = { tokens: Token[] };

class GraphQLService extends ErgoGraphQLProvider {
  #getBalance;
  #getHeight;
  #getTokenMetadata;

  constructor() {
    super(
      getNetworkType() === Network.Mainnet
        ? "https://explore.sigmaspace.io/api/graphql"
        : "https://tn-ergo-explorer.anetabtc.io/graphql"
    );

    this.#getBalance = this.createOperation<BalanceResponse, BalanceArgs>(BALANCE_QUERY);
    this.#getHeight = this.createOperation<HeightResponse>(HEIGHT_QUERY);
    this.#getTokenMetadata = this.createOperation<TokenResponse, TokenArgs>(TOKEN_METADATA_QUERY);
  }

  public async getCurrentHeight(): Promise<number | undefined> {
    const response = await this.#getHeight();
    return response.data?.blockHeaders[0].height;
  }

  public async getBalance(addresses: string[]) {
    const response = await this.#getBalance({ addresses });
    return response.data?.addresses.flatMap((x) => x.balance) || [];
  }

  public async *streamTokenMetadata(tokenIds: string[]) {
    const chunks = chunk(tokenIds, 20);
    for (const tokenIds of chunks) {
      const response = await this.#getTokenMetadata({ tokenIds });

      if (response.data?.tokens) {
        yield response.data.tokens;
      }
    }
  }

  public async *yeldBoxes(args: QueryBoxesArgs) {
    const take = 50;

    let len = 0;
    let skip = 0;

    do {
      const chunk = await this.getBoxess({ ...args, take, skip });
      skip += take;
      len = chunk.length;

      if (some(chunk)) {
        yield chunk;
      }
    } while (len === take);
  }

  public async getBoxess(args: QueryBoxesArgs): Promise<Box<string>[]> {
    const query = this.createOperation<{ boxes: GraphQLBox[] }, QueryBoxesArgs>(`
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
      }
    `);

    const response = await query(args);

    return (
      response.data?.boxes.map((box) => ({
        ...box,
        additionalRegisters: box.additionalRegisters as NonMandatoryRegisters
      })) || []
    );
  }
}

export const graphQLService = new GraphQLService();
