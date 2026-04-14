import { apiFetch } from "../../api/api";

export async function fetchProduct(productType, productId) {
  try {
    const response = await apiFetch(`/products/${productType}/${productId}`);
    
    // Handle wrapped responses (with success/error fields)
    if (response && typeof response === 'object') {
      if (response.success === false) {
        console.error(`API error: ${response.error}`, response);
        return null;
      }
      // If response has a 'data' wrapper, unwrap it
      if (response.data && !response.productid) {
        return response.data;
      }
      // Otherwise return the response as-is (raw product)
      return response;
    }
    
    console.error("Invalid response format:", response);
    return null;
  } catch (err) {
    console.error(`Failed to fetch product ${productId}:`, err);
    return null;
  }
}

export function normalizeProduct(product) {
  if (!product || typeof product !== 'object') {
    console.error("normalizeProduct: Invalid product input", product);
    throw new Error("Invalid product data");
  }

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
  try {
    const now = new Date();
    
    // Parse availableFrom - skip if it's the zero-value date
    let availableFrom = null;
    if (product?.availableFrom && product.availableFrom !== "0001-01-01T00:00:00Z") {
      availableFrom = new Date(product.availableFrom);
      if (isNaN(availableFrom.getTime())) {
        availableFrom = null;
      }
    }
    
    // Parse availableTo - skip if it's the zero-value date
    let availableTo = null;
    if (product?.availableTo && product.availableTo !== "0001-01-01T00:00:00Z") {
      availableTo = new Date(product.availableTo);
      if (isNaN(availableTo.getTime())) {
        availableTo = null;
      }
    }

    const isAvailable = 
      (!availableFrom || now >= availableFrom) && 
      (!availableTo || now <= availableTo);

    return {
      isAvailable,
      availableFrom,
      availableTo,
    };
  } catch (err) {
    console.error("Error parsing product availability:", err, product);
    return {
      isAvailable: true,
      availableFrom: null,
      availableTo: null,
    };
  }
}
