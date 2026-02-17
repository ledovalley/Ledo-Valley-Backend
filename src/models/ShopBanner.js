import mongoose from "mongoose";

const shopBannerSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },

    title: String,
    subtitle: String,
    buttonText: String,
    buttonLink: String,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

shopBannerSchema.index({ order: 1 });

export default mongoose.model("ShopBanner", shopBannerSchema);
