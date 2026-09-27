import { Schema, model, Document, Types } from 'mongoose';

export interface IRecommendationItem {
  productId: Types.ObjectId;
  name: string;
  score: number;
}

export interface IRecommendation extends Document {
  key: string; // productId as string
  type: string; // "FREQUENTLY_BOUGHT_TOGETHER"
  items: IRecommendationItem[];
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    key: { type: String, required: true, index: true },
    type: { type: String, required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        score: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const Recommendation = model<IRecommendation>('Recommendation', RecommendationSchema);
