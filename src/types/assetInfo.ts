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

export type AssetInfo = {
  metadata?: AssetMetadata;
  conversion?: ConversionOptions;
  tokenId: string;
  amount: bigint;
};
