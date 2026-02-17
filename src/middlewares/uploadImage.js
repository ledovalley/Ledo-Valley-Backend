import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../services/cloudinary.service.js";

/* ======================================================
   FACTORY FUNCTION (Dynamic Folder Support)
====================================================== */
const createCloudinaryUploader = (folderName) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folderName,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });

  return multer({ storage });
};

/* ======================================================
   EXPORTS
====================================================== */

export const uploadProductImage =
  createCloudinaryUploader("products");

export const uploadShopBannerImage =
  createCloudinaryUploader("shop-banners");
