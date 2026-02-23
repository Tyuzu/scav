// renderListingCard.js
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";
import { addToCart } from "../../cart/addToCart.js";

export function renderListingCard(listing, cropName, isLoggedIn) {
  let quantity = 1;

  const quantityDisplay = createElement("span", { class: "quantity-value" }, [quantity]);
  const incrementBtn = createElement("button", {}, ["+"]);
  const decrementBtn = createElement("button", {}, ["−"]);

  incrementBtn.onclick = () => {
    quantity++;
    quantityDisplay.textContent = quantity;
  };

  decrementBtn.onclick = () => {
    if (quantity > 1) {
      quantity--;
      quantityDisplay.textContent = quantity;
    }
  };

  const quantityWrapper = createElement("div", { class: "quantity-control" }, [
    decrementBtn, quantityDisplay, incrementBtn
  ]);

  const farmLink = createElement("a", { href: "#" }, [listing.farmName]);
  farmLink.onclick = e => {
    e.preventDefault();
    navigate(`/farm/${listing.farmid}`);
  };

  const handleAddToCart = () => {
    // Event-based: backend validates and looks up all details
    addToCart({
      itemId: listing.cropid,
      quantity,
      isLoggedIn
    });
  };

  return createElement("div", { class: "listing-card" }, [
    farmLink,
    createElement("p", {}, [`Location: ${listing.location}`]),
    createElement("p", {}, [`Breed: ${listing.breed}`]),
    createElement("p", {}, [`Price: ₹${listing.pricePerKg} per kg`]),
    createElement("label", {}, ["Quantity (kg):"]),
    quantityWrapper,
    Button("Add-To-Cart", "a2c-crop", { click: handleAddToCart }, "buttonx")
  ]);
}
