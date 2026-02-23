import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";

export function renderPagination(container, total, limit, offset, onPageChange) {
  const pageCount = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const pagination = createElement("div", { class: "pagination" }, [
    Button(
      "Prev",
      "page-prev-btn",
      {
        disabled: offset === 0,
        click: () => onPageChange(currentPage - 1),
      },
      "secondary-button"
    ),
    createElement("span", {}, [`Page ${currentPage} of ${pageCount}`]),
    Button(
      "Next",
      "page-next-btn",
      {
        disabled: offset + limit >= total,
        click: () => onPageChange(currentPage + 1),
      },
      "secondary-button"
    ),
  ]);

  container.appendChild(pagination);
}
