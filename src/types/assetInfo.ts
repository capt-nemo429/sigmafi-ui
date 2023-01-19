export enum AssetType {
  PictureArtwork = "0101",
  AudioArtwork = "0102",
  VideoArtwork = "0103",
  ThresholdSignature = "0201"
}

type ConversionOptions = {
  rate: number;
  currency: string;
};

export type AssetMetadata = {
  name?: string;
  decimals?: number;
  type?: AssetType;
};

export type AssetInfo<AmountType> = {
  metadata?: AssetMetadata;
  conversion?: ConversionOptions;
  tokenId: string;
  amount: AmountType;
};

export type VerifiedAsset = Required<Pick<AssetInfo<bigint>, "tokenId" | "metadata">>;
