import "../../../css/ui/Owl.css";

const Owl = (eventsArray) => {
    const owlContainer = document.createElement('div');
    owlContainer.className = 'owl';

    eventsArray.forEach((event, index) => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';

        const img = document.createElement('img');
        img.src = event.image || '';
        img.alt = event.name || 'Event Image';
        img.className = 'event-image';

        const details = document.createElement('div');
        details.className = 'event-details';

        const name = document.createElement('h3');
        name.textContent = event.name || 'Event Name';

        const date = document.createElement('p');
        date.textContent = `Date: ${event.date || 'TBD'}`;

        const location = document.createElement('p');
        location.textContent = `Location: ${event.location || 'TBD'}`;

        details.appendChild(name);
        details.appendChild(date);
        details.appendChild(location);
        eventCard.appendChild(img);
        eventCard.appendChild(details);

        eventCard.addEventListener('click', () => {
            alert(`You clicked on ${event.name}`); // Replace with desired functionality
        });

        owlContainer.appendChild(eventCard);
    });

    return owlContainer;
};

export default Owl;
