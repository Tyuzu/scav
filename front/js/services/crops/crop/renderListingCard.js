// renderListingCard.js
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";

export function renderListingCard(listing) {
  let quantity = 1;

  const quantityDisplay = createElement(
    "span",
    { class: "quantity-value" },
    [String(quantity)]
  );

  const updateQuantity = () => {
    quantityDisplay.textContent = String(quantity);
  };

  const incrementBtn = createElement(
    "button",
    {
      type: "button",
      events: {
        click: () => {
          quantity++;
          updateQuantity();
        }
      }
    },
    ["+"]
  );

  const decrementBtn = createElement(
    "button",
    {
      type: "button",
      events: {
        click: () => {
          if (quantity > 1) {
            quantity--;
            updateQuantity();
          }
        }
      }
    },
    ["−"]
  );

  const quantityWrapper = createElement(
    "div",
    { class: "quantity-control" },
    [decrementBtn, quantityDisplay, incrementBtn]
  );

  const farmUrl = `/farm/${listing.farmid}`;

  const farmLink = createElement(
    "a",
    {
      href: farmUrl,
      events: {
        click: (e) => {
          e.preventDefault();
          navigate(farmUrl);
        }
      }
    },
    [listing.farmName]
  );

  const handleAddToCart = async () => {
    try {
      await addToCart({
        itemId: listing.cropid,
        itemType: listing.breed ?? "crop",
        itemName: listing.name,
        quantity,
        isLoggedIn: Boolean(getState("token")),
        entityType: "farm",
        entityId: listing.farmid,
        entityName: listing.farmName
      });
    } catch (error) {
      console.error("Failed to add item to cart:", error);
    }
  };

  return createElement("div", { class: "listing-card" }, [
    farmLink,

    createElement("p", {}, [
      `Location: ${listing.location ?? "N/A"}`
    ]),

    createElement("p", {}, [
      `Breed: ${listing.breed ?? "N/A"}`
    ]),

    createElement("p", {}, [
      `Price: ₹${listing.pricePerKg} per kg`
    ]),

    createElement("label", {}, ["Quantity (kg):"]),

    quantityWrapper,

    Button(
      "Add-To-Cart",
      "a2c-crop",
      { click: handleAddToCart },
      "buttonx"
    )
  ]);
}