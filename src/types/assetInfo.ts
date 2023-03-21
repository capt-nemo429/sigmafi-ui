export enum AssetType {
  PictureArtwork = "0101",
  AudioArtwork = "0102",
  VideoArtwork = "0103",
  ThresholdSignature = "0201"
}

type AssetPriceConversion = {
  rate: number;
  currency: string;
};

export type AssetMetadata = {
  name?: string;
  decimals?: number;
  type?: AssetType;
  url?: string;
};

export type AssetInfo<AmountType> = {
  metadata?: AssetMetadata;
  conversion?: AssetPriceConversion;
  tokenId: string;
  amount: AmountType;
};

export type VerifiedAsset = Required<Pick<AssetInfo<bigint>, "tokenId" | "metadata">>;
