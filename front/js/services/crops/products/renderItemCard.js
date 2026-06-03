import Button from "../../../components/base/Button";
import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement";
import { navigate } from "../../../routes";
import {
  resolveImagePath,
  EntityType,
  PictureType,
} from "../../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import { renderItemForm } from "./createOrEdit.js";

export function renderItemCard(
  item,
  type,
  isLoggedIn,
  container,
  refresh
) {
  let quantity = 1;

  const quantityDisplay = createElement(
    "span",
    { class: "quantity-value" },
    [String(quantity)]
  );

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

  const quantityControl = createElement(
    "div",
    { class: "quantity-control" },
    [decrementBtn, quantityDisplay, incrementBtn]
  );

  const handleAdd = async (e) => {
    e.stopPropagation();

    await addToCart({
      itemId: item.productid,
      quantity,
      isLoggedIn: Boolean(getState("token")),
                    itemType: type,
                    itemName: item.name,
                    entityType: "product",
                    entityId: item.productid,
                    entityName: item.name,
    });
  };

  const currentUserId = getState("user");

  const isCreator =
  isLoggedIn &&
  currentUserId &&
  item.userid === currentUserId;

  // ---------------------------------
  // IMAGE SECTION
  // ---------------------------------

  const imageSection = createElement(
    "div",
    { class: "image-section" }
  );

  const image = Imagex({
    src: resolveImagePath(
      EntityType.PRODUCT,
      PictureType.THUMB,
      item.banner
    ),
    alt: item.name || "Product",
    id: `product-image-${item.productid}`,
  });

  image.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  imageSection.appendChild(image);

  if (isCreator) {
    imageSection.append(
      Button(
        "Edit Image",
        `edit-image-${item.productid}`,
        {
          click: (e) => {
            e.stopPropagation();

            updateImageWithCrop({
              entityType: EntityType.PRODUCT,
              imageType: "banner",
              stateKey: "banner",
              stateEntityKey: "product",
              previewElementId: `product-image-${item.productid}`,
              pictureType: PictureType.THUMB,
              entityId: item.productid,
            });
          },
        },
        "edit-banner-pic"
      )
    );
  }

  const cardChildren = [
    imageSection,
    createElement("h3", {}, [item.name]),
    createElement("p", {}, [`₹${item.price.toFixed(2)}`]),
    createElement("p", {}, [item.description]),
    createElement("label", {}, ["Quantity:"]),
    quantityControl,
    Button(
      "Add to Cart",
      `add-to-cart-${item.productid}`,
      { click: handleAdd },
      "buttonx"
    ),
  ];

  if (isCreator) {
    cardChildren.push(
      Button(
        "Edit",
        `edit-${type}-${item.productid}`,
        {
          click: (e) => {
            e.stopPropagation();

            renderItemForm(
              container,
              "edit",
              item,
              type,
              refresh
            );
          },
        },
        "buttonx"
      )
    );
  }

  const card = createElement(
    "div",
    { class: `${type}-card` },
    cardChildren
  );

  card.addEventListener("click", () => {
    navigate(`/products/${type}/${item.productid}`);
  });

  return card;
}
