import { createElement } from "../../components/createElement";
import Button from "../../components/base/Button.js";
import { addToCart } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";

export function renderProductActions(product, productType, productId) {
  let quantity = 1;

  const quantityValue = createElement("span", { class: "quantity-value" }, [String(quantity)]);
  const updateQuantityDisplay = () => quantityValue.replaceChildren(String(quantity));

  const setQuantity = (n) => {
    quantity = n;
    updateQuantityDisplay();
  };

  const decrementBtn = Button("−", "", {
    click: () => {
      if (quantity > 1) {
        setQuantity(quantity - 1);
      }
    },
  }, "quantity-btn");

  const incrementBtn = Button("+", "", {
    click: () => setQuantity(quantity + 1),
  }, "quantity-btn");

  const quantityControl = createElement("div", { 
    class: "quantity-control",
    id: `qty-${productId}`,
  }, [
    decrementBtn,
    quantityValue,
    incrementBtn,
  ]);

  const handleAdd = async () => {
    await addToCart({
      itemId: product.productid,
      quantity,
      isLoggedIn: Boolean(getState("token")),
      itemType: productType || "product",
      itemName: product.name,
      entityType: "product",
      entityId: product.productid,
      entityName: product.name,
    });
  };

  const addToCartBtn = Button(
    "Add to Cart",
    `add-to-cart-${product.productid}`,
    { click: handleAdd },
    "primary-button"
  );

  return createElement("div", { class: "product-actions" }, [
    createElement("div", { class: "quantity-section" }, [
      createElement("label", {}, ["Quantity:"]),
      quantityControl,
    ]),
    addToCartBtn,
  ]);
}
