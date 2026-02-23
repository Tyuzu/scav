import Modal from "../../../components/ui/Modal.mjs";
import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

export function openHireWorkerModal(worker) {
  const wrapper = createElement("div", { class: "hire-worker-modal" });

  const imgSrc = resolveImagePath(EntityType.BAITO, PictureType.THUMB, worker.avatar);
  const image = Imagex({
    src: imgSrc,
    alt: `${worker.name} profile picture`,
    classes: "worker-image"
  });

  const details = createElement("div", { class: "worker-details" }, [
    createElement("h3", { class: "worker-name" }, [worker.name]),
    createElement("p", { class: "worker-phone" }, [`📞 ${worker.phone_number || "N/A"}`]),
    createElement("p", { class: "worker-role" }, [`🎯 ${worker.preferred_roles || "Unspecified"}`]),
    createElement("p", { class: "worker-location" }, [`📍 ${worker.address || "Unknown"}`]),
    createElement("p", { class: "worker-bio" }, [`📝 ${worker.bio || "No bio provided."}`])
  ]);

  wrapper.append(image, details);

  const { close } = Modal({
    title: "Worker Details",
    content: wrapper,
    onClose: () => close(),
    size: "medium",
    closeOnOverlayClick: true
  });
}
