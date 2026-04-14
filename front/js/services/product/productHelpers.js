import { apiFetch } from "../../api/api";

export async function fetchProduct(productType, productId) {
  try {
    const product = await apiFetch(`/products/${productType}/${productId}`);
    return product;
  } catch (err) {
    console.error(`Failed to fetch product ${productId}:`, err);
    return null;
  }
}

export function normalizeProduct(product) {
  return {
    productid: product.productid || product.id,
    name: product.name || "",
    price: parseFloat(product.price) || 0,
    unit: product.unit || "unit",
    description: product.description || "",
    images: Array.isArray(product.images) ? product.images : [],
    category: product.category || "",
    sku: product.sku || "",
    ...product,
  };
}

export function getProductAvailability(product) {
  const now = new Date();
  const availableFrom = product.availableFrom ? new Date(product.availableFrom) : null;
  const availableTo = product.availableTo ? new Date(product.availableTo) : null;

  const isAvailable = 
    (!availableFrom || now >= availableFrom) && 
    (!availableTo || now <= availableTo);

  return {
    isAvailable,
    availableFrom,
    availableTo,
  };
}
