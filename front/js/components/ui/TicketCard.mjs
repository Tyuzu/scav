import { applyButtonColors } from "../../utils/lumicolor.js";
import "../../../css/ui/TicketCard1.css";
import Button from "../base/Button.js";

const TicketCard = ({ isl, seatstart, seatend, creator, name, price, quantity, color, attributes = {}, onClick }) => {
  const card = document.createElement('div');
  card.classList.add('ticket-card');

  // Dynamic attributes
  Object.entries(attributes).forEach(([key, value]) => card.setAttribute(key, value));

  // Folded corner
  const corner = document.createElement('div');
  corner.style.borderTop = `40px solid ${color}`;
  corner.classList.add('corner');
  
  card.appendChild(corner);

  // Left color stripe with perforation
  const stripeContainer = document.createElement('div');
  stripeContainer.classList.add('stripe-container');
  stripeContainer.style.backgroundColor = color;

  const perforation = document.createElement('div');
  perforation.classList.add('perforation');
  stripeContainer.appendChild(perforation);

  card.appendChild(stripeContainer);

  // Main content
  const content = document.createElement('div');
  content.classList.add('content');

  const nameElement = document.createElement('h2');
  nameElement.textContent = name;
  nameElement.style.color = color;
  content.appendChild(nameElement);

  if (seatstart && seatend) {
    const seats = document.createElement('p');
    seats.textContent = `Seats: ${seatstart} - ${seatend}`;
    content.appendChild(seats);
  }

  const info = document.createElement('div');
  info.classList.add('tickinfo');

  const priceElement = document.createElement('span');
  priceElement.textContent = `Price: ${price}`;

  const availableElement = document.createElement('span');
  availableElement.textContent = `Available: ${quantity}`;

  info.appendChild(priceElement);
  info.appendChild(availableElement);
  content.appendChild(info);

  // Buy button
  if (!creator && isl) {
    const button = Button("Buy Ticket","",{},"buttonx primary");
    if (quantity > 0) {
      button.textContent = 'Buy Ticket';
      button.addEventListener('click', () => onClick(name, quantity));
      applyButtonColors(button, color);
    } else {
      button.textContent = 'Sold Out';
      button.style.backgroundColor = '#ddd';
      button.style.color = '#000';
      button.disabled = true;
    }
    content.appendChild(button);
  }

  card.appendChild(content);
  return card;
};

export default TicketCard;
