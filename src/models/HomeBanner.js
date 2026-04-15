import mongoose from "mongoose";

const homeBannerSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    
    mobileImage: {
      url: String,
      publicId: String,
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

homeBannerSchema.index({ order: 1 });

export default mongoose.model("HomeBanner", homeBannerSchema);
