import Button from "../../../components/base/Button";
import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement";
import Carousel from "../../../components/ui/Carousel.mjs";
import { ImageGallery } from "../../../components/ui/IMageGallery.mjs";
import { navigate } from "../../../routes";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import {renderItemForm} from "./createOrEdit.js";

export function renderItemCard(item, type, isLoggedIn, container, refresh) {
  let quantity = 1;

  const quantityDisplay = createElement("span", { class: "quantity-value" }, [String(quantity)]);

  const decrementBtn = Button("−", "", {
    click: (e) => {
      e.stopPropagation();
      if (quantity > 1) {
        quantity--;
        quantityDisplay.textContent = String(quantity);
      }
    },
  });

  const incrementBtn = Button("+", "", {
    click: (e) => {
      e.stopPropagation();
      quantity++;
      quantityDisplay.textContent = String(quantity);
    },
  });

  const quantityControl = createElement("div", { class: "quantity-control" }, [
    decrementBtn,
    quantityDisplay,
    incrementBtn,
  ]);

  const handleAdd = async (e) => {
    e.stopPropagation();
    // Add to cart with full metadata
    await addToCart({
      itemId: item.productid,
      quantity,
      isLoggedIn: Boolean(getState("token")),
      itemType: type,
      itemName: item.name,
      entityType: "product",
      entityId: item.productid,
      entityName: item.name
    });
  };

  // Check if current user is the creator
  const currentUserId = getState("user");
  const isCreator = isLoggedIn && currentUserId && item.userid === currentUserId;

  // --- Image Gallery Section ---
  const gallerySection = createElement("div", { class: "gallery-section" });
  const cleanImageNames = (item.images || []).filter(Boolean);
  if (cleanImageNames.length) {
    const fullURLs = cleanImageNames.map(name =>
      resolveImagePath(EntityType.PRODUCT, PictureType.THUMB, name)
    );
    console.log(fullURLs);
    const gallery = ImageGallery(fullURLs);
    // Prevent image gallery clicks from bubbling up to card click
    gallery.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    gallerySection.appendChild(gallery);
  }

  const cardChildren = [
    gallerySection,
    createElement("h3", {}, [item.name]),
    createElement("p", {}, [`₹${item.price.toFixed(2)}`]),
    createElement("p", {}, [item.description]),
    createElement("label", {}, ["Quantity:"]),
    quantityControl,
    Button("Add to Cart", `add-to-cart-${item.productid}`, { click: handleAdd }, "buttonx"),
  ];

  // Only show Edit button if user is the creator
  if (isCreator) {
    cardChildren.push(
      Button(
        "Edit",
        `edit-${type}-${item.productid}`,
        {
          click: (e) => {
            e.stopPropagation();
            renderItemForm(container, "edit", item, type, refresh);
          },
        },
        "buttonx"
      )
    );
  }

  const card = createElement("div", { class: `${type}-card` }, cardChildren);

  card.addEventListener("click", () => {
    navigate(`/products/${type}/${item.productid}`);
  });

  return card;
}
